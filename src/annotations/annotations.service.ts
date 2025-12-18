import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAnnotationDto,
  UpdateAnnotationDto,
} from './dto/create-annotation.dto';
import { CreateReplyDto } from './dto/create-reply.dto';

@Injectable()
export class AnnotationsService {
  constructor(private prisma: PrismaService) {}

  async create(createAnnotationDto: CreateAnnotationDto, userId: string) {
    // Verify user is a jury member for this thesis
    const juryMember = await this.prisma.juryMember.findFirst({
      where: {
        thesisId: createAnnotationDto.thesisId,
        userId,
        isActive: true,
      },
    });

    if (!juryMember) {
      throw new ForbiddenException(
        'Solo los miembros del jurado pueden anotar documentos',
      );
    }

    // Verify thesis is in evaluation status
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: createAnnotationDto.thesisId },
    });

    if (!thesis || thesis.status !== 'EN_EVALUACION') {
      throw new ForbiddenException(
        'Solo se pueden hacer anotaciones cuando la tesis esta en evaluacion',
      );
    }

    const annotation = await this.prisma.pdfAnnotation.create({
      data: {
        ...createAnnotationDto,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return annotation;
  }

  async findByDocument(documentId: string) {
    return this.prisma.pdfAnnotation.findMany({
      where: { documentId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findByThesis(thesisId: string) {
    return this.prisma.pdfAnnotation.findMany({
      where: { thesisId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        document: {
          select: {
            id: true,
            title: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const annotation = await this.prisma.pdfAnnotation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!annotation) {
      throw new NotFoundException('Anotacion no encontrada');
    }

    return annotation;
  }

  async update(
    id: string,
    updateAnnotationDto: UpdateAnnotationDto,
    userId: string,
  ) {
    const annotation = await this.prisma.pdfAnnotation.findUnique({
      where: { id },
    });

    if (!annotation) {
      throw new NotFoundException('Anotacion no encontrada');
    }

    if (annotation.userId !== userId) {
      throw new ForbiddenException('Solo puedes editar tus propias anotaciones');
    }

    return this.prisma.pdfAnnotation.update({
      where: { id },
      data: updateAnnotationDto,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const annotation = await this.prisma.pdfAnnotation.findUnique({
      where: { id },
    });

    if (!annotation) {
      throw new NotFoundException('Anotacion no encontrada');
    }

    if (annotation.userId !== userId) {
      throw new ForbiddenException(
        'Solo puedes eliminar tus propias anotaciones',
      );
    }

    await this.prisma.pdfAnnotation.delete({
      where: { id },
    });

    return { success: true, id };
  }

  async resolve(id: string, userId: string) {
    const annotation = await this.prisma.pdfAnnotation.findUnique({
      where: { id },
      include: { thesis: true },
    });

    if (!annotation) {
      throw new NotFoundException('Anotacion no encontrada');
    }

    // Verify user is a jury member for this thesis
    const juryMember = await this.prisma.juryMember.findFirst({
      where: {
        thesisId: annotation.thesisId,
        userId,
        isActive: true,
      },
    });

    if (!juryMember) {
      throw new ForbiddenException(
        'Solo los miembros del jurado pueden resolver anotaciones',
      );
    }

    return this.prisma.pdfAnnotation.update({
      where: { id },
      data: { isResolved: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createReply(createReplyDto: CreateReplyDto, userId: string) {
    const annotation = await this.prisma.pdfAnnotation.findUnique({
      where: { id: createReplyDto.annotationId },
    });

    if (!annotation) {
      throw new NotFoundException('Anotacion no encontrada');
    }

    // Verify user has access to this thesis (jury member, author, or admin)
    const juryMember = await this.prisma.juryMember.findFirst({
      where: {
        thesisId: annotation.thesisId,
        userId,
        isActive: true,
      },
    });

    const thesis = await this.prisma.thesis.findUnique({
      where: { id: annotation.thesisId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const isAdmin = user?.roles.some((r) => r.name === 'ADMIN');
    const isAuthor = thesis?.authorId === userId || thesis?.coAuthorId === userId;

    if (!juryMember && !isAdmin && !isAuthor) {
      throw new ForbiddenException('No tienes permiso para responder anotaciones');
    }

    return this.prisma.annotationReply.create({
      data: {
        annotationId: createReplyDto.annotationId,
        userId,
        content: createReplyDto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getAnnotationStats(thesisId: string) {
    const annotations = await this.prisma.pdfAnnotation.groupBy({
      by: ['userId', 'color'],
      where: { thesisId },
      _count: true,
    });

    const resolved = await this.prisma.pdfAnnotation.count({
      where: { thesisId, isResolved: true },
    });

    const total = await this.prisma.pdfAnnotation.count({
      where: { thesisId },
    });

    return {
      total,
      resolved,
      pending: total - resolved,
      byUser: annotations,
    };
  }
}
