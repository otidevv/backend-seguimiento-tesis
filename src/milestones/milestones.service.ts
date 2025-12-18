import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo hito para una tesis
   */
  async create(createMilestoneDto: CreateMilestoneDto, userId: string) {
    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: createMilestoneDto.thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    // Verificar que el usuario puede agregar hitos (autor, asesor o admin)
    const canCreate = await this.canModifyThesisMilestones(thesis, userId);
    if (!canCreate) {
      throw new ForbiddenException('No tiene permisos para agregar hitos a esta tesis');
    }

    // Obtener el orden maximo actual
    const maxOrder = await this.prisma.milestone.aggregate({
      where: { thesisId: createMilestoneDto.thesisId },
      _max: { order: true },
    });

    const order = createMilestoneDto.order ?? (maxOrder._max.order ?? -1) + 1;

    return this.prisma.milestone.create({
      data: {
        thesisId: createMilestoneDto.thesisId,
        title: createMilestoneDto.title,
        description: createMilestoneDto.description,
        dueDate: createMilestoneDto.dueDate ? new Date(createMilestoneDto.dueDate) : null,
        order,
      },
    });
  }

  /**
   * Obtiene todos los hitos de una tesis
   */
  async findByThesis(thesisId: string) {
    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    return this.prisma.milestone.findMany({
      where: { thesisId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Obtiene un hito por ID
   */
  async findOne(id: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id },
      include: { thesis: true },
    });

    if (!milestone) {
      throw new NotFoundException('Hito no encontrado');
    }

    return milestone;
  }

  /**
   * Actualiza un hito
   */
  async update(id: string, updateMilestoneDto: UpdateMilestoneDto, userId: string) {
    const milestone = await this.findOne(id);

    // Verificar permisos
    const canModify = await this.canModifyThesisMilestones(milestone.thesis, userId);
    if (!canModify) {
      throw new ForbiddenException('No tiene permisos para modificar este hito');
    }

    // Si se marca como completado, establecer la fecha de completado
    const completedAt = updateMilestoneDto.isCompleted === true
      ? new Date()
      : updateMilestoneDto.isCompleted === false
        ? null
        : undefined;

    return this.prisma.milestone.update({
      where: { id },
      data: {
        title: updateMilestoneDto.title,
        description: updateMilestoneDto.description,
        dueDate: updateMilestoneDto.dueDate ? new Date(updateMilestoneDto.dueDate) : undefined,
        isCompleted: updateMilestoneDto.isCompleted,
        completedAt,
        order: updateMilestoneDto.order,
      },
    });
  }

  /**
   * Marca un hito como completado
   */
  async complete(id: string, userId: string) {
    const milestone = await this.findOne(id);

    // Verificar permisos
    const canModify = await this.canModifyThesisMilestones(milestone.thesis, userId);
    if (!canModify) {
      throw new ForbiddenException('No tiene permisos para completar este hito');
    }

    return this.prisma.milestone.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Desmarca un hito como completado
   */
  async uncomplete(id: string, userId: string) {
    const milestone = await this.findOne(id);

    // Verificar permisos
    const canModify = await this.canModifyThesisMilestones(milestone.thesis, userId);
    if (!canModify) {
      throw new ForbiddenException('No tiene permisos para modificar este hito');
    }

    return this.prisma.milestone.update({
      where: { id },
      data: {
        isCompleted: false,
        completedAt: null,
      },
    });
  }

  /**
   * Elimina un hito
   */
  async remove(id: string, userId: string) {
    const milestone = await this.findOne(id);

    // Verificar permisos
    const canModify = await this.canModifyThesisMilestones(milestone.thesis, userId);
    if (!canModify) {
      throw new ForbiddenException('No tiene permisos para eliminar este hito');
    }

    return this.prisma.milestone.delete({
      where: { id },
    });
  }

  /**
   * Reordena los hitos de una tesis
   */
  async reorder(thesisId: string, milestoneIds: string[], userId: string) {
    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    // Verificar permisos
    const canModify = await this.canModifyThesisMilestones(thesis, userId);
    if (!canModify) {
      throw new ForbiddenException('No tiene permisos para reordenar los hitos');
    }

    // Actualizar el orden de cada hito
    const updates = milestoneIds.map((id, index) =>
      this.prisma.milestone.update({
        where: { id },
        data: { order: index },
      })
    );

    await this.prisma.$transaction(updates);

    return this.findByThesis(thesisId);
  }

  /**
   * Verifica si un usuario puede modificar los hitos de una tesis
   */
  private async canModifyThesisMilestones(thesis: any, userId: string): Promise<boolean> {
    // El autor, asesor o co-asesor pueden modificar
    if (
      thesis.authorId === userId ||
      thesis.advisorId === userId ||
      thesis.coAdvisorId === userId
    ) {
      return true;
    }

    // Verificar si es admin o coordinador
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) return false;

    return user.roles.some(
      (role) => role.name === 'ADMIN' || role.name === 'COORDINADOR'
    );
  }
}
