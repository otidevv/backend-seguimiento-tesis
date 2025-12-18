import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import {
  CreateAnnotationDto,
  UpdateAnnotationDto,
} from './dto/create-annotation.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('annotations')
@UseGuards(JwtAuthGuard)
export class AnnotationsController {
  constructor(private readonly annotationsService: AnnotationsService) {}

  @Post()
  create(
    @Body() createAnnotationDto: CreateAnnotationDto,
    @CurrentUser() user: any,
  ) {
    return this.annotationsService.create(createAnnotationDto, user.userId);
  }

  @Get('document/:documentId')
  findByDocument(@Param('documentId') documentId: string) {
    return this.annotationsService.findByDocument(documentId);
  }

  @Get('thesis/:thesisId')
  findByThesis(@Param('thesisId') thesisId: string) {
    return this.annotationsService.findByThesis(thesisId);
  }

  @Get('thesis/:thesisId/stats')
  getStats(@Param('thesisId') thesisId: string) {
    return this.annotationsService.getAnnotationStats(thesisId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.annotationsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateAnnotationDto: UpdateAnnotationDto,
    @CurrentUser() user: any,
  ) {
    return this.annotationsService.update(id, updateAnnotationDto, user.userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.annotationsService.delete(id, user.userId);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.annotationsService.resolve(id, user.userId);
  }

  @Post('replies')
  createReply(@Body() createReplyDto: CreateReplyDto, @CurrentUser() user: any) {
    return this.annotationsService.createReply(createReplyDto, user.userId);
  }
}
