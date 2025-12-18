import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { ReviewDecision, ThesisStatus, JuryRole } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Crea un dictamen (solo jurados asignados)
   */
  async create(createReviewDto: CreateReviewDto, userId: string) {
    const { thesisId, decision, observations, comments } = createReviewDto;

    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
      include: { juryMembers: true },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    // Verificar que la tesis está en estado EN_EVALUACION
    if (thesis.status !== ThesisStatus.EN_EVALUACION) {
      throw new BadRequestException(
        'Solo se puede emitir dictamen cuando la tesis está en evaluación',
      );
    }

    // Verificar que el usuario es miembro del jurado
    const juryMember = thesis.juryMembers.find(
      (jm) => jm.userId === userId && jm.isActive,
    );

    if (!juryMember) {
      throw new ForbiddenException('No eres miembro del jurado de esta tesis');
    }

    // Obtener el número de revisión actual
    const lastReview = await this.prisma.review.findFirst({
      where: { thesisId, juryMemberId: juryMember.id },
      orderBy: { reviewNumber: 'desc' },
    });

    const reviewNumber = lastReview ? lastReview.reviewNumber + 1 : 1;

    // Crear el dictamen
    const review = await this.prisma.review.create({
      data: {
        thesisId,
        juryMemberId: juryMember.id,
        decision,
        observations,
        comments,
        reviewNumber,
        reviewedAt: decision !== ReviewDecision.PENDIENTE ? new Date() : null,
      },
      include: this.getReviewIncludes(),
    });

    // Notificar al Presidente si todos los jurados han emitido dictamen
    await this.checkAndNotifyPresident(thesisId);

    return review;
  }

  /**
   * Actualiza un dictamen
   */
  async update(id: string, updateReviewDto: UpdateReviewDto, userId: string) {
    const review = await this.findOne(id);

    // Verificar que el usuario es el autor del dictamen
    const juryMember = await this.prisma.juryMember.findUnique({
      where: { id: review.juryMemberId },
    });

    if (!juryMember || juryMember.userId !== userId) {
      throw new ForbiddenException('Solo puedes editar tu propio dictamen');
    }

    // No se puede editar si ya se procesó el resultado
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: review.thesisId },
    });

    if (
      thesis &&
      thesis.status !== ThesisStatus.EN_EVALUACION &&
      thesis.status !== ThesisStatus.COMISION_ASIGNADA
    ) {
      throw new BadRequestException(
        'No se puede modificar el dictamen después de que se haya procesado',
      );
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        ...updateReviewDto,
        reviewedAt:
          updateReviewDto.decision && updateReviewDto.decision !== ReviewDecision.PENDIENTE
            ? new Date()
            : review.reviewedAt,
      },
      include: this.getReviewIncludes(),
    });

    // Notificar al Presidente si todos los jurados han emitido dictamen
    await this.checkAndNotifyPresident(review.thesisId);

    return updated;
  }

  /**
   * Obtiene un dictamen por ID
   */
  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: this.getReviewIncludes(),
    });

    if (!review) {
      throw new NotFoundException(`Dictamen con ID ${id} no encontrado`);
    }

    return review;
  }

  /**
   * Lista los dictámenes de una tesis
   */
  async findByThesis(thesisId: string) {
    return this.prisma.review.findMany({
      where: { thesisId },
      include: this.getReviewIncludes(),
      orderBy: [{ reviewNumber: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Lista los dictámenes emitidos por un usuario (como jurado)
   */
  async findMyReviews(userId: string) {
    const juryMemberships = await this.prisma.juryMember.findMany({
      where: { userId, isActive: true },
      select: { id: true },
    });

    const juryMemberIds = juryMemberships.map((jm) => jm.id);

    return this.prisma.review.findMany({
      where: { juryMemberId: { in: juryMemberIds } },
      include: {
        ...this.getReviewIncludes(),
        thesis: {
          select: {
            id: true,
            title: true,
            status: true,
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene el resumen de dictámenes de una tesis
   */
  async getThesisReviewSummary(thesisId: string) {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
      include: {
        juryMembers: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
            reviews: {
              orderBy: { reviewNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    const summary = thesis.juryMembers.map((jm) => {
      const latestReview = jm.reviews[0];
      return {
        juryMember: {
          id: jm.id,
          role: jm.role,
          user: jm.user,
        },
        latestReview: latestReview
          ? {
              id: latestReview.id,
              decision: latestReview.decision,
              reviewNumber: latestReview.reviewNumber,
              reviewedAt: latestReview.reviewedAt,
            }
          : null,
        hasReviewed: latestReview?.decision !== ReviewDecision.PENDIENTE,
      };
    });

    const totalReviews = summary.filter((s) => s.hasReviewed).length;
    const approvedCount = summary.filter(
      (s) => s.latestReview?.decision === ReviewDecision.APROBADO,
    ).length;
    const observedCount = summary.filter(
      (s) => s.latestReview?.decision === ReviewDecision.OBSERVADO,
    ).length;
    const rejectedCount = summary.filter(
      (s) => s.latestReview?.decision === ReviewDecision.RECHAZADO,
    ).length;

    return {
      thesisId,
      thesisStatus: thesis.status,
      totalJuryMembers: thesis.juryMembers.length,
      totalReviews,
      approvedCount,
      observedCount,
      rejectedCount,
      isComplete: totalReviews === thesis.juryMembers.length,
      juryReviews: summary,
    };
  }

  /**
   * Notifica al Presidente cuando todos los jurados han emitido dictamen
   */
  private async checkAndNotifyPresident(thesisId: string) {
    const summary = await this.getThesisReviewSummary(thesisId);

    // Si no todos han emitido dictamen, no hacer nada
    if (!summary.isComplete) return;

    // Buscar al presidente del jurado
    const president = await this.prisma.juryMember.findFirst({
      where: {
        thesisId,
        role: JuryRole.PRESIDENTE,
        isActive: true,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!president) return;

    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
    });

    if (!thesis || thesis.status !== ThesisStatus.EN_EVALUACION) return;

    // Notificar al presidente que todos los dictámenes están completos
    await this.notificationsService.create({
      userId: president.userId,
      title: 'Dictámenes completos - Decisión requerida',
      message: `Todos los jurados han emitido su dictamen para la tesis "${thesis.title.substring(0, 50)}...". ` +
        `Resultado: ${summary.approvedCount} aprobados, ${summary.observedCount} observados, ${summary.rejectedCount} rechazados. ` +
        `Como Presidente, debe emitir la decisión final.`,
    });
  }

  /**
   * Permite al Presidente del jurado decidir el estado final de la tesis
   * Solo el Presidente tiene potestad para cambiar el estado a OBSERVADA, APROBADA o RECHAZADA
   */
  async presidentDecision(
    thesisId: string,
    decision: 'OBSERVADA' | 'APROBADA' | 'RECHAZADA',
    reason: string,
    userId: string,
  ) {
    // Verificar que la tesis existe y está en evaluación
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
      include: {
        juryMembers: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        author: { select: { id: true, firstName: true, lastName: true } },
        coAuthor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    if (thesis.status !== ThesisStatus.EN_EVALUACION) {
      throw new BadRequestException(
        'Solo se puede emitir decisión cuando la tesis está en evaluación',
      );
    }

    // Verificar que el usuario es el Presidente del jurado
    const president = thesis.juryMembers.find(
      (jm) => jm.userId === userId && jm.role === JuryRole.PRESIDENTE,
    );

    if (!president) {
      throw new ForbiddenException(
        'Solo el Presidente del jurado puede emitir la decisión final',
      );
    }

    // Obtener resumen de dictámenes para metadata
    const summary = await this.getThesisReviewSummary(thesisId);

    const newStatus = ThesisStatus[decision];

    // Actualizar estado de la tesis
    const updatedThesis = await this.prisma.thesis.update({
      where: { id: thesisId },
      data: {
        status: newStatus,
        ...(newStatus === ThesisStatus.APROBADA && { approvalDate: new Date() }),
      },
    });

    // Registrar en historial
    await this.prisma.thesisStatusHistory.create({
      data: {
        thesisId,
        previousStatus: ThesisStatus.EN_EVALUACION,
        newStatus,
        changedById: userId,
        reason: `Decisión del Presidente: ${reason}`,
        metadata: JSON.stringify({
          ...summary,
          presidentDecision: decision,
          presidentReason: reason,
        }),
      },
    });

    // Notificar a los tesistas
    const statusLabel = this.getStatusLabel(newStatus);

    await this.notificationsService.create({
      userId: thesis.authorId,
      title: 'Resultado de evaluación de tesis',
      message: `El Presidente del jurado ha emitido la decisión sobre tu tesis "${thesis.title.substring(0, 50)}...": ${statusLabel}. Motivo: ${reason}`,
    });

    if (thesis.coAuthorId) {
      await this.notificationsService.create({
        userId: thesis.coAuthorId,
        title: 'Resultado de evaluación de tesis',
        message: `El Presidente del jurado ha emitido la decisión sobre tu tesis "${thesis.title.substring(0, 50)}...": ${statusLabel}. Motivo: ${reason}`,
      });
    }

    return {
      thesis: updatedThesis,
      decision,
      reason,
      summary,
    };
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
   * Configuración de includes para las consultas
   */
  private getReviewIncludes() {
    return {
      juryMember: {
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
    };
  }
}
