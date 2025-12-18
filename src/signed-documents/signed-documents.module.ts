import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SignedDocumentsController } from './signed-documents.controller';
import { SignedDocumentsService } from './signed-documents.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [SignedDocumentsController],
  providers: [SignedDocumentsService],
  exports: [SignedDocumentsService],
})
export class SignedDocumentsModule {}
