import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDeadlineDto, ExtendDeadlineDto } from './dto';
import { DeadlineStatus, DeadlineType, ThesisStatus } from '@prisma/client';

// Configuración de plazos por defecto según el proceso
const DEFAULT_DEADLINES: Record<DeadlineType, { businessDays?: number; calendarDays?: number }> = {
  EVALUACION_COMISION: { businessDays: 15 },
  LEVANTAMIENTO_OBS: { calendarDays: 30 },
  AMPLIACION_OBS: { calendarDays: 30 },
  REVISION_CORRECCION: { businessDays: 5 },
  SUSTENTACION: { calendarDays: 30 },
};

@Injectable()
export class DeadlinesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Crea un nuevo plazo
   */
  async create(createDeadlineDto: CreateDeadlineDto) {
    const { thesisId, type, dueDate, businessDays, calendarDays, notes } = createDeadlineDto;

    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    // Cancelar plazos activos del mismo tipo
    await this.prisma.deadline.updateMany({
      where: {
        thesisId,
        type,
        status: DeadlineStatus.ACTIVO,
      },
      data: {
        status: DeadlineStatus.CANCELADO,
      },
    });

    // Crear el nuevo plazo
    return this.prisma.deadline.create({
      data: {
        thesisId,
        type,
        dueDate: new Date(dueDate),
        businessDays: businessDays || DEFAULT_DEADLINES[type]?.businessDays,
        calendarDays: calendarDays || DEFAULT_DEADLINES[type]?.calendarDays,
        notes,
        status: DeadlineStatus.ACTIVO,
      },
      include: this.getDeadlineIncludes(),
    });
  }

  /**
   * Crea plazos automáticos según el estado de la tesis
   */
  async createAutomaticDeadline(thesisId: string, thesisStatus: ThesisStatus) {
    const deadlineConfig = this.getDeadlineConfigForStatus(thesisStatus);
    if (!deadlineConfig) return null;

    const { type, days, isBusinessDays } = deadlineConfig;

    // Calcular fecha límite
    const dueDate = isBusinessDays
      ? this.addBusinessDays(new Date(), days)
      : this.addCalendarDays(new Date(), days);

    return this.create({
      thesisId,
      type,
      dueDate: dueDate.toISOString(),
      ...(isBusinessDays ? { businessDays: days } : { calendarDays: days }),
    });
  }

  /**
   * Extiende un plazo existente
   */
  async extend(id: string, extendDeadlineDto: ExtendDeadlineDto) {
    const deadline = await this.findOne(id);

    if (deadline.status !== DeadlineStatus.ACTIVO) {
      throw new BadRequestException('Solo se pueden extender plazos activos');
    }

    // Verificar que solo se puede extender observaciones una vez
    if (deadline.type === DeadlineType.LEVANTAMIENTO_OBS) {
      const hasExtension = await this.prisma.deadline.findFirst({
        where: {
          thesisId: deadline.thesisId,
          type: DeadlineType.AMPLIACION_OBS,
          status: { in: [DeadlineStatus.ACTIVO, DeadlineStatus.CUMPLIDO] },
        },
      });

      if (hasExtension) {
        throw new BadRequestException('Ya se ha otorgado una ampliación para este plazo');
      }
    }

    // Marcar plazo actual como extendido
    await this.prisma.deadline.update({
      where: { id },
      data: { status: DeadlineStatus.EXTENDIDO },
    });

    // Crear nuevo plazo de ampliación
    return this.prisma.deadline.create({
      data: {
        thesisId: deadline.thesisId,
        type:
          deadline.type === DeadlineType.LEVANTAMIENTO_OBS
            ? DeadlineType.AMPLIACION_OBS
            : deadline.type,
        dueDate: new Date(extendDeadlineDto.newDueDate),
        extensionOf: id,
        notes: extendDeadlineDto.reason,
        status: DeadlineStatus.ACTIVO,
      },
      include: this.getDeadlineIncludes(),
    });
  }

  /**
   * Marca un plazo como cumplido
   */
  async markAsCompleted(id: string) {
    const deadline = await this.findOne(id);

    if (deadline.status !== DeadlineStatus.ACTIVO) {
      throw new BadRequestException('Solo se pueden completar plazos activos');
    }

    return this.prisma.deadline.update({
      where: { id },
      data: {
        status: DeadlineStatus.CUMPLIDO,
        completedAt: new Date(),
      },
      include: this.getDeadlineIncludes(),
    });
  }

  /**
   * Marca un plazo como vencido
   */
  async markAsExpired(id: string) {
    return this.prisma.deadline.update({
      where: { id },
      data: { status: DeadlineStatus.VENCIDO },
      include: this.getDeadlineIncludes(),
    });
  }

  /**
   * Obtiene un plazo por ID
   */
  async findOne(id: string) {
    const deadline = await this.prisma.deadline.findUnique({
      where: { id },
      include: this.getDeadlineIncludes(),
    });

    if (!deadline) {
      throw new NotFoundException(`Plazo con ID ${id} no encontrado`);
    }

    return deadline;
  }

  /**
   * Lista los plazos de una tesis
   */
  async findByThesis(thesisId: string) {
    return this.prisma.deadline.findMany({
      where: { thesisId },
      include: this.getDeadlineIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista los plazos activos de una tesis
   */
  async findActiveByThesis(thesisId: string) {
    return this.prisma.deadline.findMany({
      where: {
        thesisId,
        status: DeadlineStatus.ACTIVO,
      },
      include: this.getDeadlineIncludes(),
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Lista todos los plazos próximos a vencer
   */
  async findUpcoming(days: number = 7) {
    const futureDate = this.addCalendarDays(new Date(), days);

    return this.prisma.deadline.findMany({
      where: {
        status: DeadlineStatus.ACTIVO,
        dueDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        ...this.getDeadlineIncludes(),
        thesis: {
          select: {
            id: true,
            title: true,
            status: true,
            author: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Lista todos los plazos vencidos sin procesar
   */
  async findExpired() {
    return this.prisma.deadline.findMany({
      where: {
        status: DeadlineStatus.ACTIVO,
        dueDate: { lt: new Date() },
      },
      include: {
        ...this.getDeadlineIncludes(),
        thesis: {
          select: {
            id: true,
            title: true,
            status: true,
            author: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Procesa los plazos vencidos (job programado)
   */
  async processExpiredDeadlines() {
    const expired = await this.findExpired();
    const processed: string[] = [];

    for (const deadline of expired) {
      await this.markAsExpired(deadline.id);

      // Si es un plazo crítico, actualizar estado de la tesis
      if (
        deadline.type === DeadlineType.LEVANTAMIENTO_OBS ||
        deadline.type === DeadlineType.AMPLIACION_OBS
      ) {
        await this.prisma.thesis.update({
          where: { id: deadline.thesisId },
          data: { status: ThesisStatus.PLAZO_VENCIDO },
        });

        await this.prisma.thesisStatusHistory.create({
          data: {
            thesisId: deadline.thesisId,
            previousStatus: deadline.thesis.status,
            newStatus: ThesisStatus.PLAZO_VENCIDO,
            changedById: deadline.thesis.author.id,
            reason: `Plazo vencido: ${deadline.type}`,
          },
        });
      }

      processed.push(deadline.id);
    }

    return { processed: processed.length, ids: processed };
  }

  /**
   * Obtiene configuración de plazo según estado de tesis
   */
  private getDeadlineConfigForStatus(status: ThesisStatus): {
    type: DeadlineType;
    days: number;
    isBusinessDays: boolean;
  } | null {
    const config: Record<string, { type: DeadlineType; days: number; isBusinessDays: boolean }> = {
      [ThesisStatus.EN_EVALUACION]: {
        type: DeadlineType.EVALUACION_COMISION,
        days: 15,
        isBusinessDays: true,
      },
      [ThesisStatus.OBSERVADA]: {
        type: DeadlineType.LEVANTAMIENTO_OBS,
        days: 30,
        isBusinessDays: false,
      },
    };

    return config[status] || null;
  }

  /**
   * Añade días hábiles a una fecha
   */
  private addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let added = 0;

    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        added++;
      }
    }

    return result;
  }

  /**
   * Añade días calendario a una fecha
   */
  private addCalendarDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Calcula los días restantes de un plazo (hábiles o calendario)
   */
  async getRemainingDays(id: string): Promise<{
    deadline: any;
    remainingDays: number;
    remainingBusinessDays: number;
    isExpired: boolean;
    isUrgent: boolean;
    dueDate: Date;
  }> {
    const deadline = await this.findOne(id);
    const now = new Date();
    const dueDate = new Date(deadline.dueDate);

    const remainingCalendarDays = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const remainingBusinessDays = this.countBusinessDaysBetween(now, dueDate);

    return {
      deadline,
      remainingDays: remainingCalendarDays,
      remainingBusinessDays,
      isExpired: remainingCalendarDays < 0,
      isUrgent: remainingBusinessDays <= 3 && remainingBusinessDays > 0,
      dueDate,
    };
  }

  /**
   * Obtiene el estado del plazo activo de una tesis
   */
  async getActiveDeadlineStatus(thesisId: string) {
    const activeDeadlines = await this.findActiveByThesis(thesisId);

    if (activeDeadlines.length === 0) {
      return { hasActiveDeadline: false, deadlines: [] };
    }

    const deadlinesWithStatus = await Promise.all(
      activeDeadlines.map(async (deadline) => {
        const status = await this.getRemainingDays(deadline.id);
        return {
          ...deadline,
          remainingDays: status.remainingDays,
          remainingBusinessDays: status.remainingBusinessDays,
          isExpired: status.isExpired,
          isUrgent: status.isUrgent,
        };
      }),
    );

    return {
      hasActiveDeadline: true,
      deadlines: deadlinesWithStatus,
    };
  }

  /**
   * Envía alertas de vencimiento próximo a los usuarios afectados
   * Debe llamarse periódicamente (ej: cron job diario)
   */
  async sendUpcomingDeadlineAlerts(daysBeforeAlert: number = 3) {
    const upcoming = await this.findUpcoming(daysBeforeAlert);
    const alertsSent: string[] = [];

    for (const deadline of upcoming) {
      const remaining = await this.getRemainingDays(deadline.id);

      // Solo alertar si quedan 3 días hábiles o menos
      if (remaining.remainingBusinessDays <= daysBeforeAlert && remaining.remainingBusinessDays > 0) {
        const thesis = deadline.thesis;

        // Obtener tipo de deadline para el mensaje
        const deadlineTypeLabel = this.getDeadlineTypeLabel(deadline.type);

        // Alertar a los tesistas
        await this.notificationsService.notifyDeadlineApproaching(
          thesis.author.id,
          thesis.title,
          deadlineTypeLabel,
          remaining.remainingBusinessDays,
        );

        // Si es plazo de evaluación de comisión, alertar a los jurados
        if (deadline.type === DeadlineType.EVALUACION_COMISION) {
          const juryMembers = await this.prisma.juryMember.findMany({
            where: { thesisId: deadline.thesisId, isActive: true },
          });

          for (const jury of juryMembers) {
            await this.notificationsService.create({
              userId: jury.userId,
              title: 'Plazo de evaluación próximo a vencer',
              message: `El plazo para emitir dictamen de la tesis "${thesis.title.substring(0, 40)}..." ` +
                `vence en ${remaining.remainingBusinessDays} día(s) hábil(es).`,
            });
          }
        }

        alertsSent.push(deadline.id);
      }
    }

    return { alertsSent: alertsSent.length, ids: alertsSent };
  }

  /**
   * Cuenta los días hábiles entre dos fechas
   */
  private countBusinessDaysBetween(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current < end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Obtiene la etiqueta legible del tipo de deadline
   */
  private getDeadlineTypeLabel(type: DeadlineType): string {
    const labels: Record<DeadlineType, string> = {
      EVALUACION_COMISION: 'Evaluación de Comisión',
      LEVANTAMIENTO_OBS: 'Levantamiento de Observaciones',
      AMPLIACION_OBS: 'Ampliación de Observaciones',
      REVISION_CORRECCION: 'Revisión de Correcciones',
      SUSTENTACION: 'Sustentación',
    };
    return labels[type] || type;
  }

  /**
   * Configuración de includes para las consultas
   */
  private getDeadlineIncludes() {
    return {
      extension: true,
      extensions: true,
    };
  }
}
