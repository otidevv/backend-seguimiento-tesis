import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { DeadlinesService } from './deadlines.service';
import { CreateDeadlineDto, ExtendDeadlineDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('deadlines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeadlinesController {
  constructor(private readonly deadlinesService: DeadlinesService) {}

  /**
   * Crea un nuevo plazo (ADMIN/COORDINADOR)
   */
  @Post()
  @Roles('ADMIN', 'COORDINADOR')
  create(@Body() createDeadlineDto: CreateDeadlineDto) {
    return this.deadlinesService.create(createDeadlineDto);
  }

  /**
   * Lista los plazos próximos a vencer
   */
  @Get('upcoming')
  @Roles('ADMIN', 'COORDINADOR')
  findUpcoming(@Query('days', new ParseIntPipe({ optional: true })) days?: number) {
    return this.deadlinesService.findUpcoming(days || 7);
  }

  /**
   * Lista los plazos vencidos sin procesar
   */
  @Get('expired')
  @Roles('ADMIN', 'COORDINADOR')
  findExpired() {
    return this.deadlinesService.findExpired();
  }

  /**
   * Procesa los plazos vencidos (actualiza estados)
   */
  @Post('process-expired')
  @Roles('ADMIN')
  processExpired() {
    return this.deadlinesService.processExpiredDeadlines();
  }

  /**
   * Obtiene un plazo por ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deadlinesService.findOne(id);
  }

  /**
   * Lista los plazos de una tesis
   */
  @Get('thesis/:thesisId')
  findByThesis(@Param('thesisId', ParseUUIDPipe) thesisId: string) {
    return this.deadlinesService.findByThesis(thesisId);
  }

  /**
   * Lista los plazos activos de una tesis
   */
  @Get('thesis/:thesisId/active')
  findActiveByThesis(@Param('thesisId', ParseUUIDPipe) thesisId: string) {
    return this.deadlinesService.findActiveByThesis(thesisId);
  }

  /**
   * Extiende un plazo
   */
  @Post(':id/extend')
  @Roles('ADMIN', 'COORDINADOR')
  extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() extendDeadlineDto: ExtendDeadlineDto,
  ) {
    return this.deadlinesService.extend(id, extendDeadlineDto);
  }

  /**
   * Marca un plazo como cumplido
   */
  @Post(':id/complete')
  @Roles('ADMIN', 'COORDINADOR')
  markAsCompleted(@Param('id', ParseUUIDPipe) id: string) {
    return this.deadlinesService.markAsCompleted(id);
  }

  /**
   * Obtiene los días restantes de un plazo
   */
  @Get(':id/remaining')
  getRemainingDays(@Param('id', ParseUUIDPipe) id: string) {
    return this.deadlinesService.getRemainingDays(id);
  }

  /**
   * Obtiene el estado de los plazos activos de una tesis
   */
  @Get('thesis/:thesisId/status')
  getActiveDeadlineStatus(@Param('thesisId', ParseUUIDPipe) thesisId: string) {
    return this.deadlinesService.getActiveDeadlineStatus(thesisId);
  }

  /**
   * Envía alertas de vencimiento próximo (job manual o cron)
   */
  @Post('send-alerts')
  @Roles('ADMIN')
  sendUpcomingAlerts(@Query('days', new ParseIntPipe({ optional: true })) days?: number) {
    return this.deadlinesService.sendUpcomingDeadlineAlerts(days || 3);
  }
}
