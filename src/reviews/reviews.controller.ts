import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, PresidentDecisionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Crea un dictamen (solo jurados)
   */
  @Post()
  @Roles('DOCENTE', 'COORDINADOR')
  create(@Body() createReviewDto: CreateReviewDto, @CurrentUser() user: any) {
    return this.reviewsService.create(createReviewDto, user.userId);
  }

  /**
   * Lista los dictámenes del usuario actual (como jurado)
   */
  @Get('me')
  @Roles('DOCENTE', 'COORDINADOR')
  findMyReviews(@CurrentUser() user: any) {
    return this.reviewsService.findMyReviews(user.userId);
  }

  /**
   * Obtiene un dictamen por ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.findOne(id);
  }

  /**
   * Lista los dictámenes de una tesis
   */
  @Get('thesis/:thesisId')
  findByThesis(@Param('thesisId', ParseUUIDPipe) thesisId: string) {
    return this.reviewsService.findByThesis(thesisId);
  }

  /**
   * Obtiene el resumen de dictámenes de una tesis
   */
  @Get('thesis/:thesisId/summary')
  getThesisReviewSummary(@Param('thesisId', ParseUUIDPipe) thesisId: string) {
    return this.reviewsService.getThesisReviewSummary(thesisId);
  }

  /**
   * Actualiza un dictamen
   */
  @Put(':id')
  @Roles('DOCENTE', 'COORDINADOR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.update(id, updateReviewDto, user.userId);
  }

  /**
   * Decisión final del Presidente del jurado
   * Solo el Presidente puede cambiar el estado de la tesis a OBSERVADA, APROBADA o RECHAZADA
   */
  @Post('president-decision')
  @Roles('DOCENTE', 'COORDINADOR')
  presidentDecision(
    @Body() presidentDecisionDto: PresidentDecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.presidentDecision(
      presidentDecisionDto.thesisId,
      presidentDecisionDto.decision,
      presidentDecisionDto.reason,
      user.userId,
    );
  }
}
