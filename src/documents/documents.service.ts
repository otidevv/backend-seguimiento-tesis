import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly uploadDir = './uploads/documents';

  constructor(private prisma: PrismaService) {
    // Crear directorio de uploads si no existe
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async create(
    dto: CreateDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: dto.thesisId },
      include: {
        author: true,
        advisor: true,
        coAdvisor: true,
      },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    // Verificar permisos
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const isAdmin = user?.roles.some((r) => r.name === 'ADMIN');
    const isCoordinator = user?.roles.some((r) => r.name === 'COORDINADOR');
    const isAuthor = thesis.authorId === userId;
    const isAdvisor = thesis.advisorId === userId;
    const isCoAdvisor = thesis.coAdvisorId === userId;

    if (!isAdmin && !isCoordinator && !isAuthor && !isAdvisor && !isCoAdvisor) {
      throw new ForbiddenException('No tienes permiso para subir documentos a esta tesis');
    }

    // Sanitizar nombre de archivo (remover caracteres especiales)
    const sanitizedName = file.originalname
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Reemplazar caracteres especiales con _
      .replace(/_+/g, '_'); // Evitar múltiples guiones bajos

    const fileName = `${Date.now()}-${sanitizedName}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Crear registro en BD
    return this.prisma.document.create({
      data: {
        thesisId: dto.thesisId,
        title: dto.title,
        description: dto.description,
        fileUrl: `/uploads/documents/${fileName}`,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    });
  }

  async findByThesis(thesisId: string) {
    // Verificar que la tesis existe
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    return this.prisma.document.findMany({
      where: { thesisId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
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

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return document;
  }

  async update(id: string, dto: UpdateDocumentDto, userId: string) {
    const document = await this.findOne(id);
    await this.checkPermission(document.thesis, userId);

    return this.prisma.document.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    const document = await this.findOne(id);
    await this.checkPermission(document.thesis, userId);

    // Eliminar archivo físico
    const filePath = path.join('.', document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return this.prisma.document.delete({
      where: { id },
    });
  }

  async download(id: string) {
    const document = await this.findOne(id);
    const filePath = path.join('.', document.fileUrl);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en el servidor');
    }

    // Obtener la extensión del archivo original
    const originalExtension = path.extname(document.fileUrl);

    // Construir nombre de archivo con extensión
    let fileName = document.title;
    if (!fileName.toLowerCase().endsWith(originalExtension.toLowerCase())) {
      fileName = `${document.title}${originalExtension}`;
    }

    return {
      filePath,
      fileName,
      mimeType: document.fileType,
    };
  }

  private async checkPermission(
    thesis: { authorId: string; advisorId: string; coAdvisorId: string | null },
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    const isAdmin = user?.roles.some((r) => r.name === 'ADMIN');
    const isCoordinator = user?.roles.some((r) => r.name === 'COORDINADOR');
    const isAuthor = thesis.authorId === userId;
    const isAdvisor = thesis.advisorId === userId;
    const isCoAdvisor = thesis.coAdvisorId === userId;

    if (!isAdmin && !isCoordinator && !isAuthor && !isAdvisor && !isCoAdvisor) {
      throw new ForbiddenException('No tienes permiso para realizar esta accion');
    }
  }
}
