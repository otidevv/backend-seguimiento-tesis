import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSignedDocumentDto } from './dto/create-signed-document.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SignedDocumentsService {
  private readonly uploadPath = './uploads/signed-documents';

  constructor(private prisma: PrismaService) {
    // Crear directorio si no existe
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async create(
    createSignedDocumentDto: CreateSignedDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Verificar que el usuario es el PRESIDENTE del jurado para esta tesis
    const juryMember = await this.prisma.juryMember.findFirst({
      where: {
        thesisId: createSignedDocumentDto.thesisId,
        userId,
        role: 'PRESIDENTE',
        isActive: true,
      },
    });

    if (!juryMember) {
      throw new ForbiddenException(
        'Solo el Presidente del jurado puede subir documentos firmados',
      );
    }

    // Verificar que la tesis esta en estado APROBADA o EN_EVALUACION
    const thesis = await this.prisma.thesis.findUnique({
      where: { id: createSignedDocumentDto.thesisId },
    });

    if (!thesis) {
      throw new NotFoundException('Tesis no encontrada');
    }

    if (!['EN_EVALUACION', 'APROBADA', 'OBSERVADA'].includes(thesis.status)) {
      throw new BadRequestException(
        'Solo se pueden subir documentos firmados cuando la tesis esta en evaluacion, aprobada u observada',
      );
    }

    // Verificar que el archivo sea PDF
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    // Guardar archivo
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(this.uploadPath, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Crear registro en BD
    const signedDocument = await this.prisma.signedDocument.create({
      data: {
        thesisId: createSignedDocumentDto.thesisId,
        uploadedBy: userId,
        title: createSignedDocumentDto.title,
        description: createSignedDocumentDto.description,
        fileUrl: `/uploads/signed-documents/${fileName}`,
        fileType: file.mimetype,
        fileSize: file.size,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return signedDocument;
  }

  async findByThesis(thesisId: string) {
    return this.prisma.signedDocument.findMany({
      where: { thesisId },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.signedDocument.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento firmado no encontrado');
    }

    return document;
  }

  async delete(id: string, userId: string) {
    const document = await this.prisma.signedDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Documento firmado no encontrado');
    }

    // Solo el que subio el documento puede eliminarlo
    if (document.uploadedBy !== userId) {
      throw new ForbiddenException('Solo puedes eliminar documentos que hayas subido');
    }

    // Eliminar archivo fisico
    const filePath = path.join(process.cwd(), document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar registro de BD
    await this.prisma.signedDocument.delete({
      where: { id },
    });

    return { success: true };
  }

  async download(id: string) {
    const document = await this.findOne(id);
    const filePath = path.join(process.cwd(), document.fileUrl);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return {
      path: filePath,
      fileName: path.basename(document.fileUrl),
      mimeType: document.fileType,
    };
  }
}
