import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { SyncStudentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  /**
   * Sincroniza datos de estudiante desde API externa
   * Solo ADMIN puede sincronizar cualquier estudiante
   */
  @Post('sync')
  @Roles('ADMIN', 'COORDINADOR')
  syncFromExternalApi(@Body() syncStudentDto: SyncStudentDto) {
    return this.enrollmentsService.syncFromExternalApi(syncStudentDto.documentNumber);
  }

  /**
   * Sincroniza datos del estudiante actual
   */
  @Post('sync/me')
  @Roles('ESTUDIANTE')
  syncCurrentUser(@CurrentUser() user: any) {
    return this.enrollmentsService.syncFromExternalApi(user.documentNumber);
  }

  /**
   * Lista todas las inscripciones (ADMIN/COORDINADOR)
   */
  @Get()
  @Roles('ADMIN', 'COORDINADOR')
  findAll(@Query('careerId') careerId?: string) {
    return this.enrollmentsService.findAll(careerId);
  }

  /**
   * Obtiene las inscripciones del usuario actual
   */
  @Get('me')
  findMyEnrollments(@CurrentUser() user: any) {
    return this.enrollmentsService.findByUser(user.userId);
  }

  /**
   * Obtiene inscripción por ID
   */
  @Get(':id')
  @Roles('ADMIN', 'COORDINADOR')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentsService.findOne(id);
  }

  /**
   * Obtiene inscripción por código de estudiante
   */
  @Get('code/:studentCode')
  @Roles('ADMIN', 'COORDINADOR')
  findByStudentCode(@Param('studentCode') studentCode: string) {
    return this.enrollmentsService.findByStudentCode(studentCode);
  }

  /**
   * Obtiene inscripciones de un usuario específico
   * Permite a estudiantes ver inscripciones de otros (para seleccionar co-autor)
   */
  @Get('user/:userId')
  @Roles('ADMIN', 'COORDINADOR', 'ESTUDIANTE', 'DOCENTE')
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.enrollmentsService.findByUser(userId);
  }
}
