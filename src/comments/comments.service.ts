import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCommentDto, userId: string) {
    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: dto.thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    // Verificar que el usuario tiene acceso a la tesis
    await this.checkThesisAccess(dto.thesisId, userId);

    return this.prisma.comment.create({
      data: {
        thesisId: dto.thesisId,
        userId,
        content: dto.content,
        isPublic: dto.isPublic ?? true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: {
              select: { name: true },
            },
          },
        },
      },
    });
  }

  async findByThesis(thesisId: string, userId: string) {
    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
      include: {
        author: true,
        advisor: true,
        coAdvisor: true,
      },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    // Verificar permisos del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const isAdmin = user?.roles.some((r) => r.name === 'ADMIN');
    const isCoordinator = user?.roles.some((r) => r.name === 'COORDINADOR');
    const isDocente = user?.roles.some((r) => r.name === 'DOCENTE');
    const isAuthor = thesis.authorId === userId;
    const isAdvisor = thesis.advisorId === userId;
    const isCoAdvisor = thesis.coAdvisorId === userId;

    // Si es estudiante (autor), solo ve comentarios publicos
    // Si es docente/admin/coordinador, ve todos los comentarios
    const whereClause: { thesisId: string; isPublic?: boolean } = { thesisId };

    if (!isAdmin && !isCoordinator && !isDocente && !isAdvisor && !isCoAdvisor) {
      // Es el autor u otro estudiante - solo comentarios publicos
      whereClause.isPublic = true;
    }

    return this.prisma.comment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        thesis: {
          select: {
            id: true,
            title: true,
            authorId: true,
            advisorId: true,
            coAdvisorId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    return comment;
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.findOne(id);

    // Solo el autor del comentario o admin puede editar
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const isAdmin = user?.roles.some((r) => r.name === 'ADMIN');
    const isOwner = comment.userId === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('No tienes permiso para editar este comentario');
    }

    return this.prisma.comment.update({
      where: { id },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: {
              select: { name: true },
            },
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.findOne(id);

    // Solo el autor del comentario o admin puede eliminar
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const isAdmin = user?.roles.some((r) => r.name === 'ADMIN');
    const isOwner = comment.userId === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('No tienes permiso para eliminar este comentario');
    }

    return this.prisma.comment.delete({
      where: { id },
    });
  }

  private async checkThesisAccess(thesisId: string, userId: string) {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
      include: {
        juryMembers: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const isAdmin = user?.roles.some((r) => r.name === 'ADMIN');
    const isCoordinator = user?.roles.some((r) => r.name === 'COORDINADOR');
    const isDocente = user?.roles.some((r) => r.name === 'DOCENTE');
    const isAuthor = thesis?.authorId === userId;
    const isAdvisor = thesis?.advisorId === userId;
    const isCoAdvisor = thesis?.coAdvisorId === userId;
    const isJury = thesis?.juryMembers.some((j) => j.userId === userId);

    if (!isAdmin && !isCoordinator && !isDocente && !isAuthor && !isAdvisor && !isCoAdvisor && !isJury) {
      throw new ForbiddenException('No tienes acceso a esta tesis');
    }
  }
}
