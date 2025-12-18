import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * Obtiene estadísticas generales del dashboard (ADMIN/COORDINADOR)
   */
  @Get('dashboard')
  @Roles('ADMIN', 'COORDINADOR')
  getDashboardStats() {
    return this.statisticsService.getDashboardStats();
  }

  /**
   * Obtiene datos para gráfico de tesis por estado
   */
  @Get('charts/thesis-by-status')
  @Roles('ADMIN', 'COORDINADOR')
  getThesisByStatusChart() {
    return this.statisticsService.getThesisByStatusChart();
  }

  /**
   * Obtiene datos para gráfico de tesis por mes
   */
  @Get('charts/thesis-by-month')
  @Roles('ADMIN', 'COORDINADOR')
  getThesisByMonthChart() {
    return this.statisticsService.getThesisByMonthChart();
  }

  /**
   * Obtiene datos para gráfico de tesis por carrera
   */
  @Get('charts/thesis-by-career')
  @Roles('ADMIN', 'COORDINADOR')
  getThesisByCareerChart() {
    return this.statisticsService.getThesisByCareerChart();
  }
}
