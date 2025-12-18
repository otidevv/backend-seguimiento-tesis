import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ResolutionsService } from './resolutions.service';
import { CreateResolutionDto, UpdateResolutionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('resolutions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResolutionsController {
  constructor(private readonly resolutionsService: ResolutionsService) {}

  /**
   * Crea una nueva resolucion (solo ADMIN y COORDINADOR)
   */
  @Post()
  @Roles('ADMIN', 'COORDINADOR')
  create(
    @Body() createResolutionDto: CreateResolutionDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.resolutionsService.create(createResolutionDto, user.userId);
  }

  /**
   * Lista todas las resoluciones con paginacion y filtros
   */
  @Get()
  findAll(
    @Query('thesisId') thesisId?: string,
    @Query('type') type?: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.resolutionsService.findAll({ thesisId, type, skip, take });
  }

  /**
   * Obtiene los tipos de resolucion disponibles
   */
  @Get('types')
  getTypes() {
    return this.resolutionsService.getResolutionTypes();
  }

  /**
   * Genera el siguiente numero de resolucion
   */
  @Get('next-number')
  @Roles('ADMIN', 'COORDINADOR')
  getNextNumber(@Query('prefix') prefix?: string) {
    return this.resolutionsService.generateNextResolutionNumber(prefix);
  }

  /**
   * Busca resolucion por numero
   */
  @Get('by-number/:number')
  findByNumber(@Param('number') resolutionNumber: string) {
    return this.resolutionsService.findByNumber(resolutionNumber);
  }

  /**
   * Obtiene resoluciones de una tesis especifica
   */
  @Get('thesis/:thesisId')
  findByThesis(@Param('thesisId', ParseUUIDPipe) thesisId: string) {
    return this.resolutionsService.findByThesis(thesisId);
  }

  /**
   * Obtiene una resolucion por ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.resolutionsService.findOne(id);
  }

  /**
   * Actualiza una resolucion (solo ADMIN y COORDINADOR)
   */
  @Patch(':id')
  @Roles('ADMIN', 'COORDINADOR')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResolutionDto: UpdateResolutionDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.resolutionsService.update(
      id,
      updateResolutionDto,
      user.userId,
      user.role,
    );
  }

  /**
   * Elimina una resolucion (solo ADMIN)
   */
  @Delete(':id')
  @Roles('ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.resolutionsService.remove(id, user.userId, user.role);
  }
}
