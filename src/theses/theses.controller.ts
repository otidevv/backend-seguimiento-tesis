import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ThesesService } from './theses.service';
import { CreateThesisDto, UpdateThesisDto, ChangeStatusDto, AssignJuryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ThesisStatus } from '@prisma/client';

@Controller('theses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThesesController {
  constructor(private readonly thesesService: ThesesService) {}

  /**
   * Crea una nueva tesis (solo estudiantes)
   */
  @Post()
  @Roles('ESTUDIANTE')
  create(@Body() createThesisDto: CreateThesisDto, @CurrentUser() user: any) {
    return this.thesesService.create(createThesisDto, user.userId);
  }

  /**
   * Lista todas las tesis con filtros (ADMIN/COORDINADOR)
   * Los coordinadores con facultyId solo ven tesis de su facultad
   */
  @Get()
  @Roles('ADMIN', 'COORDINADOR')
  findAll(
    @CurrentUser() user: any,
    @Query('careerId') careerId?: string,
    @Query('status') status?: ThesisStatus,
    @Query('authorId') authorId?: string,
    @Query('advisorId') advisorId?: string,
    @Query('facultyId') facultyId?: string,
  ) {
    return this.thesesService.findAll(
      { careerId, status, authorId, advisorId, facultyId },
      user,
    );
  }

  /**
   * Obtiene las tesis del usuario actual
   */
  @Get('me')
  findMyTheses(@CurrentUser() user: any) {
    const roleNames = user.roles || [];
    return this.thesesService.findMyTheses(user.userId, roleNames);
  }

  /**
   * Obtiene las tesis activas de un usuario específico
   * Útil para verificar si un estudiante ya tiene tesis en proceso
   */
  @Get('user/:userId/active')
  @Roles('ADMIN', 'COORDINADOR', 'ESTUDIANTE', 'DOCENTE')
  findActiveThesesByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.thesesService.findActiveThesesByUser(userId);
  }

  /**
   * Obtiene una tesis por ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.thesesService.findOne(id);
  }

  /**
   * Obtiene el historial de estados de una tesis
   */
  @Get(':id/history')
  getStatusHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.thesesService.getStatusHistory(id);
  }

  /**
   * Actualiza una tesis (solo autor en estado BORRADOR)
   */
  @Put(':id')
  @Roles('ESTUDIANTE')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateThesisDto: UpdateThesisDto,
    @CurrentUser() user: any,
  ) {
    return this.thesesService.update(id, updateThesisDto, user.userId);
  }

  /**
   * Presenta una tesis (cambia de BORRADOR a PRESENTADA)
   */
  @Post(':id/submit')
  @Roles('ESTUDIANTE')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.thesesService.submit(id, user.userId);
  }

  /**
   * Cambia el estado de una tesis
   */
  @Post(':id/status')
  @Roles('ADMIN', 'COORDINADOR', 'DOCENTE')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStatusDto: ChangeStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.thesesService.changeStatus(id, changeStatusDto, user.userId);
  }

  /**
   * Asigna el jurado a una tesis
   */
  @Post(':id/jury')
  @Roles('ADMIN', 'COORDINADOR')
  assignJury(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignJuryDto: AssignJuryDto,
    @CurrentUser() user: any,
  ) {
    return this.thesesService.assignJury(id, assignJuryDto, user.userId);
  }

  /**
   * Elimina una tesis (soft delete)
   */
  @Delete(':id')
  @Roles('ESTUDIANTE', 'ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.thesesService.remove(id, user.userId);
  }
}
