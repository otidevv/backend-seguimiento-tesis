import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea una nueva notificación
   */
  async create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: createNotificationDto.userId,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
      },
    });
  }

  /**
   * Crea notificaciones para múltiples usuarios
   */
  async createForMultipleUsers(
    userIds: string[],
    title: string,
    message: string,
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      title,
      message,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  /**
   * Obtiene las notificaciones del usuario actual
   */
  async findByUser(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Obtiene las notificaciones no leídas del usuario
   */
  async findUnreadByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cuenta las notificaciones no leídas
   */
  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Marca todas las notificaciones del usuario como leídas
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  /**
   * Elimina una notificación
   */
  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Elimina todas las notificaciones leídas del usuario
   */
  async deleteAllRead(userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });
  }

  // ==========================================
  // Métodos de ayuda para crear notificaciones
  // ==========================================

  /**
   * Notifica cambio de estado de tesis
   */
  async notifyThesisStatusChange(
    userId: string,
    thesisTitle: string,
    newStatus: string,
  ) {
    return this.create({
      userId,
      title: 'Estado de tesis actualizado',
      message: `Tu tesis "${thesisTitle.substring(0, 50)}..." ha cambiado a estado: ${newStatus}`,
    });
  }

  /**
   * Notifica plazo próximo a vencer
   */
  async notifyDeadlineApproaching(
    userId: string,
    thesisTitle: string,
    deadlineType: string,
    daysRemaining: number,
  ) {
    return this.create({
      userId,
      title: 'Plazo próximo a vencer',
      message: `El plazo de ${deadlineType} para "${thesisTitle.substring(0, 40)}..." vence en ${daysRemaining} días`,
    });
  }

  /**
   * Notifica nuevo comentario
   */
  async notifyNewComment(
    userId: string,
    thesisTitle: string,
    commenterName: string,
  ) {
    return this.create({
      userId,
      title: 'Nuevo comentario',
      message: `${commenterName} ha comentado en tu tesis "${thesisTitle.substring(0, 40)}..."`,
    });
  }

  /**
   * Notifica nuevo dictamen
   */
  async notifyNewReview(
    userId: string,
    thesisTitle: string,
    reviewerName: string,
    decision: string,
  ) {
    return this.create({
      userId,
      title: 'Nuevo dictamen recibido',
      message: `${reviewerName} ha emitido dictamen (${decision}) para "${thesisTitle.substring(0, 40)}..."`,
    });
  }

  /**
   * Notifica asignación de jurado
   */
  async notifyJuryAssigned(
    userId: string,
    thesisTitle: string,
    role: string,
  ) {
    return this.create({
      userId,
      title: 'Asignado como jurado',
      message: `Has sido asignado como ${role} para la tesis "${thesisTitle.substring(0, 50)}..."`,
    });
  }
}
