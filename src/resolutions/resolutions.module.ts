import { Module } from '@nestjs/common';
import { ResolutionsService } from './resolutions.service';
import { ResolutionsController } from './resolutions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResolutionsController],
  providers: [ResolutionsService],
  exports: [ResolutionsService],
})
export class ResolutionsModule {}
