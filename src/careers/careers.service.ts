import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCareerDto, UpdateCareerDto } from './dto';

@Injectable()
export class CareersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCareerDto: CreateCareerDto) {
    // Verificar que la facultad existe
    const faculty = await this.prisma.faculty.findUnique({
      where: { id: createCareerDto.facultyId },
    });

    if (!faculty) {
      throw new NotFoundException('Facultad no encontrada');
    }

    // Verificar que el codigo no exista
    const existingCode = await this.prisma.career.findUnique({
      where: { code: createCareerDto.code },
    });

    if (existingCode) {
      throw new ConflictException('Ya existe una carrera con ese codigo');
    }

    // Verificar externalName si se proporciona
    if (createCareerDto.externalName) {
      const existingExternal = await this.prisma.career.findUnique({
        where: { externalName: createCareerDto.externalName },
      });

      if (existingExternal) {
        throw new ConflictException('Ya existe una carrera con ese nombre externo');
      }
    }

    return this.prisma.career.create({
      data: createCareerDto,
      include: {
        faculty: true,
        _count: {
          select: { enrollments: true, theses: true },
        },
      },
    });
  }

  async findAll(includeInactive = false, facultyId?: string) {
    return this.prisma.career.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(facultyId ? { facultyId } : {}),
      },
      include: {
        faculty: true,
        _count: {
          select: { enrollments: true, theses: true },
        },
      },
      orderBy: [{ faculty: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const career = await this.prisma.career.findUnique({
      where: { id },
      include: {
        faculty: true,
        _count: {
          select: { enrollments: true, theses: true },
        },
      },
    });

    if (!career) {
      throw new NotFoundException('Carrera no encontrada');
    }

    return career;
  }

  async update(id: string, updateCareerDto: UpdateCareerDto) {
    const career = await this.findOne(id);

    // Verificar facultad si se esta cambiando
    if (updateCareerDto.facultyId && updateCareerDto.facultyId !== career.facultyId) {
      const faculty = await this.prisma.faculty.findUnique({
        where: { id: updateCareerDto.facultyId },
      });

      if (!faculty) {
        throw new NotFoundException('Facultad no encontrada');
      }
    }

    // Verificar codigo unico si se esta cambiando
    if (updateCareerDto.code && updateCareerDto.code !== career.code) {
      const existingCode = await this.prisma.career.findUnique({
        where: { code: updateCareerDto.code },
      });

      if (existingCode) {
        throw new ConflictException('Ya existe una carrera con ese codigo');
      }
    }

    // Verificar externalName unico si se esta cambiando
    if (updateCareerDto.externalName && updateCareerDto.externalName !== career.externalName) {
      const existingExternal = await this.prisma.career.findUnique({
        where: { externalName: updateCareerDto.externalName },
      });

      if (existingExternal) {
        throw new ConflictException('Ya existe una carrera con ese nombre externo');
      }
    }

    return this.prisma.career.update({
      where: { id },
      data: updateCareerDto,
      include: {
        faculty: true,
        _count: {
          select: { enrollments: true, theses: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Verificar si tiene inscripciones o tesis activas
    const counts = await this.prisma.career.findUnique({
      where: { id },
      select: {
        _count: {
          select: { enrollments: true, theses: true },
        },
      },
    });

    if ((counts?._count?.enrollments || 0) > 0 || (counts?._count?.theses || 0) > 0) {
      throw new ConflictException(
        'No se puede eliminar una carrera con inscripciones o tesis asociadas',
      );
    }

    // Soft delete
    return this.prisma.career.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
