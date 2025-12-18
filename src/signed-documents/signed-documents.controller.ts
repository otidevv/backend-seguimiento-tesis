import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SignedDocumentsService } from './signed-documents.service';
import { CreateSignedDocumentDto } from './dto/create-signed-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('signed-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SignedDocumentsController {
  constructor(private readonly signedDocumentsService: SignedDocumentsService) {}

  @Post()
  @Roles('DOCENTE', 'COORDINADOR', 'ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createSignedDocumentDto: CreateSignedDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.signedDocumentsService.create(
      createSignedDocumentDto,
      file,
      user.userId,
    );
  }

  @Get('thesis/:thesisId')
  findByThesis(@Param('thesisId') thesisId: string) {
    return this.signedDocumentsService.findByThesis(thesisId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.signedDocumentsService.findOne(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const fileInfo = await this.signedDocumentsService.download(id);

    res.set({
      'Content-Type': fileInfo.mimeType,
      'Content-Disposition': `attachment; filename="${fileInfo.fileName}"`,
    });

    res.sendFile(fileInfo.path);
  }

  @Delete(':id')
  @Roles('DOCENTE', 'COORDINADOR', 'ADMIN')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.signedDocumentsService.delete(id, user.userId);
  }
}
