import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DeadlinesService } from '../deadlines/deadlines.service';
import { CreateThesisDto, UpdateThesisDto, ChangeStatusDto, AssignJuryDto } from './dto';
import { ThesisStatus, JuryRole } from '@prisma/client';

// Estados que se consideran como "tesis activa/en proceso"
const ACTIVE_THESIS_STATUSES: ThesisStatus[] = [
  'BORRADOR',
  'PRESENTADA',
  'REGISTRADA',
  'DERIVADA_ESCUELA',
  'COMISION_ASIGNADA',
  'EN_EVALUACION',
  'OBSERVADA',
  'LEVANTANDO_OBS',
  'APROBADA',
  'RESOLUCION_EMITIDA',
  'EN_DESARROLLO',
  'EN_REVISION_FINAL',
  'APTA_SUSTENTACION',
  'SUSTENTADA',
];

// Transiciones de estado válidas según el flujo del proceso
const VALID_TRANSITIONS: Record<ThesisStatus, ThesisStatus[]> = {
  BORRADOR: ['PRESENTADA'],
  PRESENTADA: ['REGISTRADA'],
  REGISTRADA: ['DERIVADA_ESCUELA'],
  DERIVADA_ESCUELA: ['COMISION_ASIGNADA'],
  COMISION_ASIGNADA: ['EN_EVALUACION'],
  EN_EVALUACION: ['OBSERVADA', 'APROBADA', 'RECHAZADA'],
  OBSERVADA: ['LEVANTANDO_OBS'],
  LEVANTANDO_OBS: ['EN_EVALUACION', 'PLAZO_VENCIDO'],
  APROBADA: ['RESOLUCION_EMITIDA'],
  RESOLUCION_EMITIDA: ['EN_DESARROLLO'],
  EN_DESARROLLO: ['EN_REVISION_FINAL'],
  EN_REVISION_FINAL: ['APTA_SUSTENTACION', 'OBSERVADA'],
  APTA_SUSTENTACION: ['SUSTENTADA'],
  SUSTENTADA: ['FINALIZADA'],
  FINALIZADA: [],
  RECHAZADA: [],
  PLAZO_VENCIDO: ['BORRADOR'], // Puede reiniciar el proceso
};

@Injectable()
export class ThesesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private deadlinesService: DeadlinesService,
  ) {}

  /**
   * Crea una nueva tesis
   */
  async create(createThesisDto: CreateThesisDto, authorId: string) {
    // Verificar que la carrera existe
    const career = await this.prisma.career.findUnique({
      where: { id: createThesisDto.careerId },
    });

    if (!career) {
      throw new NotFoundException('Carrera no encontrada');
    }

    // Verificar que el asesor existe y es docente
    const advisor = await this.prisma.user.findUnique({
      where: { id: createThesisDto.advisorId },
      include: { roles: true },
    });

    if (!advisor) {
      throw new NotFoundException('Asesor no encontrado');
    }

    const isAdvisorDocente = advisor.roles.some(
      (role) => role.name === 'DOCENTE' || role.name === 'COORDINADOR'
    );

    if (!isAdvisorDocente) {
      throw new BadRequestException('El asesor debe ser un docente');
    }

    // Verificar co-autor si se proporciona (debe ser estudiante)
    if (createThesisDto.coAuthorId) {
      if (createThesisDto.coAuthorId === authorId) {
        throw new BadRequestException('El co-autor no puede ser el mismo que el autor');
      }

      const coAuthor = await this.prisma.user.findUnique({
        where: { id: createThesisDto.coAuthorId },
        include: { roles: true },
      });

      if (!coAuthor) {
        throw new NotFoundException('Co-autor no encontrado');
      }

      const isCoAuthorEstudiante = coAuthor.roles.some(
        (role) => role.name === 'ESTUDIANTE'
      );

      if (!isCoAuthorEstudiante) {
        throw new BadRequestException('El co-autor debe ser un estudiante');
      }
    }

    // Verificar co-asesor si se proporciona
    if (createThesisDto.coAdvisorId) {
      const coAdvisor = await this.prisma.user.findUnique({
        where: { id: createThesisDto.coAdvisorId },
        include: { roles: true },
      });

      if (!coAdvisor) {
        throw new NotFoundException('Co-asesor no encontrado');
      }
    }

    // Verificar que el autor no tenga ya una tesis activa en la misma carrera
    const authorActiveThesis = await this.prisma.thesis.findFirst({
      where: {
        careerId: createThesisDto.careerId,
        isActive: true,
        status: { in: ACTIVE_THESIS_STATUSES },
        OR: [
          { authorId: authorId },
          { coAuthorId: authorId },
        ],
      },
      include: { career: true },
    });

    if (authorActiveThesis) {
      throw new BadRequestException(
        `Ya tienes una tesis activa en la carrera ${authorActiveThesis.career?.name}. ` +
        `Estado actual: ${authorActiveThesis.status}. Titulo: "${authorActiveThesis.title}"`
      );
    }

    // Verificar que el co-autor no tenga ya una tesis activa en la misma carrera
    if (createThesisDto.coAuthorId) {
      const coAuthorActiveThesis = await this.prisma.thesis.findFirst({
        where: {
          careerId: createThesisDto.careerId,
          isActive: true,
          status: { in: ACTIVE_THESIS_STATUSES },
          OR: [
            { authorId: createThesisDto.coAuthorId },
            { coAuthorId: createThesisDto.coAuthorId },
          ],
        },
        include: {
          career: true,
          author: { select: { firstName: true, lastName: true } },
        },
      });

      if (coAuthorActiveThesis) {
        throw new BadRequestException(
          `El co-autor ya tiene una tesis activa en la carrera ${coAuthorActiveThesis.career?.name}. ` +
          `Estado: ${coAuthorActiveThesis.status}. Titulo: "${coAuthorActiveThesis.title}"`
        );
      }
    }

    // Crear la tesis
    const thesis = await this.prisma.thesis.create({
      data: {
        title: createThesisDto.title,
        description: createThesisDto.description,
        academicDegree: createThesisDto.academicDegree,
        careerId: createThesisDto.careerId,
        authorId,
        coAuthorId: createThesisDto.coAuthorId,
        advisorId: createThesisDto.advisorId,
        coAdvisorId: createThesisDto.coAdvisorId,
        status: ThesisStatus.BORRADOR,
      },
      include: this.getThesisIncludes(),
    });

    // Crear registro en historial de estados
    await this.prisma.thesisStatusHistory.create({
      data: {
        thesisId: thesis.id,
        newStatus: ThesisStatus.BORRADOR,
        changedById: authorId,
        reason: 'Tesis creada',
      },
    });

    return thesis;
  }

  /**
   * Lista todas las tesis con filtros opcionales
   * Los coordinadores con facultyId asignada solo ven tesis de su facultad
   */
  async findAll(
    filters: {
      careerId?: string;
      status?: ThesisStatus;
      authorId?: string;
      advisorId?: string;
      facultyId?: string;
    },
    user?: { userId: string; roles: string[]; facultyId?: string },
  ) {
    const where: any = { isActive: true };

    // Determinar el filtro de facultad efectivo
    let effectiveFacultyId = filters.facultyId;

    if (user) {
      const isAdmin = user.roles?.includes('ADMIN');
      const isCoordinator = user.roles?.includes('COORDINADOR');

      // Si es COORDINADOR (no ADMIN) con facultad asignada, forzar filtro a su facultad
      if (isCoordinator && !isAdmin && user.facultyId) {
        effectiveFacultyId = user.facultyId;
      }
      // Si coordinador NO tiene facultyId, puede ver todas (sin restriccion)
    }

    if (filters.careerId) where.careerId = filters.careerId;
    if (filters.status) where.status = filters.status;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.advisorId) where.advisorId = filters.advisorId;

    // Filtrar por facultad (a traves de career)
    if (effectiveFacultyId) {
      where.career = {
        facultyId: effectiveFacultyId,
      };
    }

    return this.prisma.thesis.findMany({
      where,
      include: this.getThesisIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene una tesis por ID
   */
  async findOne(id: string) {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id },
      include: this.getThesisIncludes(),
    });

    if (!thesis) {
      throw new NotFoundException(`Tesis con ID ${id} no encontrada`);
    }

    return thesis;
  }

  /**
   * Obtiene las tesis del usuario actual según su rol
   */
  async findMyTheses(userId: string, userRoles: string[]) {
    const where: any = { isActive: true };

    if (userRoles.includes('ESTUDIANTE')) {
      // Estudiante ve sus tesis como autor o co-autor
      where.OR = [
        { authorId: userId },
        { coAuthorId: userId },
      ];
    } else if (userRoles.includes('DOCENTE')) {
      where.OR = [
        { advisorId: userId },
        { coAdvisorId: userId },
        { juryMembers: { some: { userId, isActive: true } } },
      ];
    }
    // ADMIN y COORDINADOR ven todas

    return this.prisma.thesis.findMany({
      where,
      include: this.getThesisIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Actualiza una tesis
   */
  async update(id: string, updateThesisDto: UpdateThesisDto, userId: string) {
    const thesis = await this.findOne(id);

    // Solo el autor o co-autor puede editar en estado BORRADOR
    if (thesis.status !== ThesisStatus.BORRADOR) {
      throw new ForbiddenException('Solo se puede editar la tesis en estado BORRADOR');
    }

    const isAuthorOrCoAuthor = thesis.authorId === userId || thesis.coAuthorId === userId;
    if (!isAuthorOrCoAuthor) {
      throw new ForbiddenException('Solo el autor o co-autor puede editar la tesis');
    }

    // Validar co-autor si se actualiza
    if (updateThesisDto.coAuthorId) {
      if (updateThesisDto.coAuthorId === thesis.authorId) {
        throw new BadRequestException('El co-autor no puede ser el mismo que el autor');
      }

      const coAuthor = await this.prisma.user.findUnique({
        where: { id: updateThesisDto.coAuthorId },
        include: { roles: true },
      });

      if (!coAuthor) {
        throw new NotFoundException('Co-autor no encontrado');
      }

      const isCoAuthorEstudiante = coAuthor.roles.some(
        (role) => role.name === 'ESTUDIANTE'
      );

      if (!isCoAuthorEstudiante) {
        throw new BadRequestException('El co-autor debe ser un estudiante');
      }
    }

    return this.prisma.thesis.update({
      where: { id },
      data: updateThesisDto,
      include: this.getThesisIncludes(),
    });
  }

  /**
   * Cambia el estado de una tesis
   */
  async changeStatus(
    id: string,
    changeStatusDto: ChangeStatusDto,
    userId: string,
  ) {
    const thesis = await this.findOne(id);
    const { newStatus, reason, metadata } = changeStatusDto;

    // Verificar si la transición es válida
    const validNextStates = VALID_TRANSITIONS[thesis.status];
    if (!validNextStates.includes(newStatus)) {
      throw new BadRequestException(
        `Transición inválida: no se puede cambiar de ${thesis.status} a ${newStatus}`,
      );
    }

    // Actualizar estado
    const updatedThesis = await this.prisma.thesis.update({
      where: { id },
      data: {
        status: newStatus,
        ...(newStatus === ThesisStatus.APROBADA && { approvalDate: new Date() }),
        ...(newStatus === ThesisStatus.SUSTENTADA && { defenseDate: new Date() }),
      },
      include: this.getThesisIncludes(),
    });

    // Registrar en historial
    await this.prisma.thesisStatusHistory.create({
      data: {
        thesisId: id,
        previousStatus: thesis.status,
        newStatus,
        changedById: userId,
        reason,
        metadata,
      },
    });

    // Notificar a los tesistas (autor y co-autor) sobre el cambio de estado
    const statusLabel = this.getStatusLabel(newStatus);

    // Notificar al autor
    await this.notificationsService.notifyThesisStatusChange(
      thesis.authorId,
      thesis.title,
      statusLabel,
    );

    // Notificar al co-autor si existe
    if (thesis.coAuthorId) {
      await this.notificationsService.notifyThesisStatusChange(
        thesis.coAuthorId,
        thesis.title,
        statusLabel,
      );
    }

    // Crear deadlines automáticos según el nuevo estado
    if (newStatus === ThesisStatus.EN_EVALUACION || newStatus === ThesisStatus.OBSERVADA) {
      await this.deadlinesService.createAutomaticDeadline(id, newStatus);

      // Si pasa a EN_EVALUACION, notificar a los jurados sobre el plazo de 15 días hábiles
      if (newStatus === ThesisStatus.EN_EVALUACION) {
        const juryMembers = await this.prisma.juryMember.findMany({
          where: { thesisId: id, isActive: true },
        });

        for (const jury of juryMembers) {
          await this.notificationsService.create({
            userId: jury.userId,
            title: 'Tesis asignada para evaluación',
            message: `Se te ha asignado la tesis "${thesis.title.substring(0, 50)}..." para evaluación. ` +
              `Tienes 15 días hábiles para emitir tu dictamen.`,
          });
        }
      }
    }

    return updatedThesis;
  }

  /**
   * Obtiene la etiqueta legible de un estado
   */
  private getStatusLabel(status: ThesisStatus): string {
    const labels: Record<ThesisStatus, string> = {
      BORRADOR: 'Borrador',
      PRESENTADA: 'Presentada',
      REGISTRADA: 'Registrada',
      DERIVADA_ESCUELA: 'Derivada a Escuela',
      COMISION_ASIGNADA: 'Comisión Asignada',
      EN_EVALUACION: 'En Evaluación',
      OBSERVADA: 'Observada',
      LEVANTANDO_OBS: 'Levantando Observaciones',
      APROBADA: 'Aprobada',
      RESOLUCION_EMITIDA: 'Resolución Emitida',
      EN_DESARROLLO: 'En Desarrollo',
      EN_REVISION_FINAL: 'En Revisión Final',
      APTA_SUSTENTACION: 'Apta para Sustentación',
      SUSTENTADA: 'Sustentada',
      FINALIZADA: 'Finalizada',
      RECHAZADA: 'Rechazada',
      PLAZO_VENCIDO: 'Plazo Vencido',
    };
    return labels[status] || status;
  }

  /**
   * Asigna el jurado a una tesis
   */
  async assignJury(id: string, assignJuryDto: AssignJuryDto, userId: string) {
    const thesis = await this.findOne(id);

    // Verificar que la tesis está en el estado correcto
    if (thesis.status !== ThesisStatus.DERIVADA_ESCUELA) {
      throw new BadRequestException(
        'Solo se puede asignar jurado cuando la tesis está derivada a la escuela',
      );
    }

    // Verificar roles requeridos
    const roles = assignJuryDto.juryMembers.map((m) => m.role);
    const requiredRoles: JuryRole[] = ['PRESIDENTE', 'SECRETARIO', 'VOCAL'];

    for (const required of requiredRoles) {
      if (!roles.includes(required)) {
        throw new BadRequestException(`Falta el rol de ${required} en el jurado`);
      }
    }

    // Verificar que los usuarios existen y son docentes
    for (const member of assignJuryDto.juryMembers) {
      const user = await this.prisma.user.findUnique({
        where: { id: member.userId },
        include: { roles: true },
      });

      if (!user) {
        throw new NotFoundException(`Usuario ${member.userId} no encontrado`);
      }

      const isDocente = user.roles.some(
        (role) => role.name === 'DOCENTE' || role.name === 'COORDINADOR'
      );

      if (!isDocente) {
        throw new BadRequestException(
          `El usuario ${user.firstName} ${user.lastName} debe ser docente para ser jurado`,
        );
      }
    }

    // Eliminar jurados anteriores
    await this.prisma.juryMember.deleteMany({
      where: { thesisId: id },
    });

    // Crear nuevos jurados
    await this.prisma.juryMember.createMany({
      data: assignJuryDto.juryMembers.map((member) => ({
        thesisId: id,
        userId: member.userId,
        role: member.role,
      })),
    });

    // Cambiar estado a COMISION_ASIGNADA
    return this.changeStatus(
      id,
      {
        newStatus: ThesisStatus.COMISION_ASIGNADA,
        reason: 'Comisión revisora asignada',
      },
      userId,
    );
  }

  /**
   * Obtiene el historial de estados de una tesis
   */
  async getStatusHistory(id: string) {
    await this.findOne(id);

    return this.prisma.thesisStatusHistory.findMany({
      where: { thesisId: id },
      include: {
        changedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Presenta una tesis (cambia de BORRADOR a PRESENTADA)
   */
  async submit(id: string, userId: string) {
    const thesis = await this.findOne(id);

    if (thesis.status !== ThesisStatus.BORRADOR) {
      throw new BadRequestException('Solo se puede presentar una tesis en estado BORRADOR');
    }

    const isAuthorOrCoAuthor = thesis.authorId === userId || thesis.coAuthorId === userId;
    if (!isAuthorOrCoAuthor) {
      throw new ForbiddenException('Solo el autor o co-autor puede presentar la tesis');
    }

    return this.changeStatus(
      id,
      {
        newStatus: ThesisStatus.PRESENTADA,
        reason: 'Tesis presentada por el estudiante',
      },
      userId,
    );
  }

  /**
   * Elimina una tesis (soft delete)
   */
  async remove(id: string, userId: string) {
    const thesis = await this.findOne(id);

    // Solo el autor puede eliminar en estado BORRADOR
    if (thesis.status !== ThesisStatus.BORRADOR) {
      throw new ForbiddenException('Solo se puede eliminar la tesis en estado BORRADOR');
    }

    return this.prisma.thesis.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Obtiene las tesis activas de un usuario (como autor o co-autor)
   * Útil para verificar si un estudiante ya tiene tesis en proceso
   */
  async findActiveThesesByUser(userId: string) {
    return this.prisma.thesis.findMany({
      where: {
        isActive: true,
        status: { in: ACTIVE_THESIS_STATUSES },
        OR: [
          { authorId: userId },
          { coAuthorId: userId },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        careerId: true,
        career: {
          select: {
            id: true,
            name: true,
          },
        },
        authorId: true,
        coAuthorId: true,
      },
    });
  }

  /**
   * Configuración de includes para las consultas
   */
  private getThesisIncludes() {
    return {
      career: {
        include: { faculty: true },
      },
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          documentNumber: true,
        },
      },
      coAuthor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          documentNumber: true,
        },
      },
      advisor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      coAdvisor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      juryMembers: {
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          documents: true,
          comments: true,
          milestones: true,
          reviews: true,
        },
      },
    };
  }
}
