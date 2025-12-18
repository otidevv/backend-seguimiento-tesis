import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResolutionDto, UpdateResolutionDto } from './dto';

@Injectable()
export class ResolutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createResolutionDto: CreateResolutionDto, issuedById: string) {
    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: createResolutionDto.thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    // Verificar que el numero de resolucion sea unico
    const existingResolution = await this.prisma.resolution.findUnique({
      where: { resolutionNumber: createResolutionDto.resolutionNumber },
    });

    if (existingResolution) {
      throw new ConflictException('El numero de resolucion ya existe');
    }

    return this.prisma.resolution.create({
      data: {
        ...createResolutionDto,
        issuedAt: new Date(createResolutionDto.issuedAt),
        issuedById,
      },
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
          },
        },
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    thesisId?: string;
    type?: string;
    skip?: number;
    take?: number;
  }) {
    const { thesisId, type, skip = 0, take = 20 } = params || {};

    const where: Record<string, unknown> = {};

    if (thesisId) {
      where.thesisId = thesisId;
    }

    if (type) {
      where.type = type;
    }

    const [resolutions, total] = await Promise.all([
      this.prisma.resolution.findMany({
        where,
        skip,
        take,
        orderBy: { issuedAt: 'desc' },
        include: {
          thesis: {
            select: {
              id: true,
              title: true,
            },
          },
          issuedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.resolution.count({ where }),
    ]);

    return {
      data: resolutions,
      meta: {
        total,
        skip,
        take,
        hasMore: skip + take < total,
      },
    };
  }

  async findByThesis(thesisId: string) {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    return this.prisma.resolution.findMany({
      where: { thesisId },
      orderBy: { issuedAt: 'desc' },
      include: {
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const resolution = await this.prisma.resolution.findUnique({
      where: { id },
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!resolution) {
      throw new NotFoundException('Resolucion no encontrada');
    }

    return resolution;
  }

  async findByNumber(resolutionNumber: string) {
    const resolution = await this.prisma.resolution.findUnique({
      where: { resolutionNumber },
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!resolution) {
      throw new NotFoundException('Resolucion no encontrada');
    }

    return resolution;
  }

  async update(
    id: string,
    updateResolutionDto: UpdateResolutionDto,
    userId: string,
    userRole: string,
  ) {
    const resolution = await this.prisma.resolution.findUnique({
      where: { id },
    });

    if (!resolution) {
      throw new NotFoundException('Resolucion no encontrada');
    }

    // Solo el emisor original o un admin puede modificar
    if (resolution.issuedById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta resolucion',
      );
    }

    // Verificar numero de resolucion unico si se esta actualizando
    if (
      updateResolutionDto.resolutionNumber &&
      updateResolutionDto.resolutionNumber !== resolution.resolutionNumber
    ) {
      const existing = await this.prisma.resolution.findUnique({
        where: { resolutionNumber: updateResolutionDto.resolutionNumber },
      });

      if (existing) {
        throw new ConflictException('El numero de resolucion ya existe');
      }
    }

    const data: Record<string, unknown> = { ...updateResolutionDto };
    if (updateResolutionDto.issuedAt) {
      data.issuedAt = new Date(updateResolutionDto.issuedAt);
    }

    return this.prisma.resolution.update({
      where: { id },
      data,
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
          },
        },
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const resolution = await this.prisma.resolution.findUnique({
      where: { id },
    });

    if (!resolution) {
      throw new NotFoundException('Resolucion no encontrada');
    }

    // Solo el emisor original o un admin puede eliminar
    if (resolution.issuedById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta resolucion',
      );
    }

    await this.prisma.resolution.delete({
      where: { id },
    });

    return { message: 'Resolucion eliminada correctamente' };
  }

  async getResolutionTypes() {
    return [
      { value: 'APROBACION_PROYECTO', label: 'Aprobacion de Proyecto' },
      { value: 'DESIGNACION_JURADO', label: 'Designacion de Jurado' },
      { value: 'DESIGNACION_ASESOR', label: 'Designacion de Asesor' },
      { value: 'APROBACION_BORRADOR', label: 'Aprobacion de Borrador' },
      {
        value: 'PROGRAMACION_SUSTENTACION',
        label: 'Programacion de Sustentacion',
      },
      { value: 'APROBACION_TESIS', label: 'Aprobacion de Tesis' },
      { value: 'DIPLOMA_GRADO', label: 'Diploma de Grado' },
      { value: 'OTRO', label: 'Otro' },
    ];
  }

  async generateNextResolutionNumber(prefix: string = 'RES') {
    const year = new Date().getFullYear();
    const pattern = `${prefix}-${year}-%`;

    const lastResolution = await this.prisma.resolution.findFirst({
      where: {
        resolutionNumber: {
          startsWith: `${prefix}-${year}-`,
        },
      },
      orderBy: {
        resolutionNumber: 'desc',
      },
    });

    if (!lastResolution) {
      return `${prefix}-${year}-0001`;
    }

    const lastNumber = parseInt(
      lastResolution.resolutionNumber.split('-').pop() || '0',
      10,
    );
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

    return `${prefix}-${year}-${nextNumber}`;
  }
}
