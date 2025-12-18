import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacultyDto, UpdateFacultyDto } from './dto';

@Injectable()
export class FacultiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFacultyDto: CreateFacultyDto) {
    // Verificar que el nombre no exista
    const existingName = await this.prisma.faculty.findUnique({
      where: { name: createFacultyDto.name },
    });

    if (existingName) {
      throw new ConflictException('Ya existe una facultad con ese nombre');
    }

    // Verificar que el codigo no exista
    const existingCode = await this.prisma.faculty.findUnique({
      where: { code: createFacultyDto.code },
    });

    if (existingCode) {
      throw new ConflictException('Ya existe una facultad con ese codigo');
    }

    // Verificar externalName si se proporciona
    if (createFacultyDto.externalName) {
      const existingExternal = await this.prisma.faculty.findUnique({
        where: { externalName: createFacultyDto.externalName },
      });

      if (existingExternal) {
        throw new ConflictException('Ya existe una facultad con ese nombre externo');
      }
    }

    return this.prisma.faculty.create({
      data: createFacultyDto,
      include: {
        careers: true,
        _count: {
          select: { careers: true },
        },
      },
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.faculty.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        careers: {
          where: includeInactive ? {} : { isActive: true },
        },
        _count: {
          select: { careers: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      include: {
        careers: true,
        _count: {
          select: { careers: true },
        },
      },
    });

    if (!faculty) {
      throw new NotFoundException(`Facultad con ID ${id} no encontrada`);
    }

    return faculty;
  }

  async update(id: string, updateFacultyDto: UpdateFacultyDto) {
    const faculty = await this.findOne(id);

    // Verificar nombre unico si se esta cambiando
    if (updateFacultyDto.name && updateFacultyDto.name !== faculty.name) {
      const existingName = await this.prisma.faculty.findUnique({
        where: { name: updateFacultyDto.name },
      });

      if (existingName) {
        throw new ConflictException('Ya existe una facultad con ese nombre');
      }
    }

    // Verificar codigo unico si se esta cambiando
    if (updateFacultyDto.code && updateFacultyDto.code !== faculty.code) {
      const existingCode = await this.prisma.faculty.findUnique({
        where: { code: updateFacultyDto.code },
      });

      if (existingCode) {
        throw new ConflictException('Ya existe una facultad con ese codigo');
      }
    }

    // Verificar externalName unico si se esta cambiando
    if (updateFacultyDto.externalName && updateFacultyDto.externalName !== faculty.externalName) {
      const existingExternal = await this.prisma.faculty.findUnique({
        where: { externalName: updateFacultyDto.externalName },
      });

      if (existingExternal) {
        throw new ConflictException('Ya existe una facultad con ese nombre externo');
      }
    }

    return this.prisma.faculty.update({
      where: { id },
      data: updateFacultyDto,
      include: {
        careers: true,
        _count: {
          select: { careers: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Verificar si tiene carreras activas
    const careersCount = await this.prisma.career.count({
      where: { facultyId: id, isActive: true },
    });

    if (careersCount > 0) {
      throw new ConflictException(
        'No se puede eliminar una facultad con carreras activas',
      );
    }

    // Soft delete
    return this.prisma.faculty.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
