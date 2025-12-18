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
  ParseBoolPipe,
} from '@nestjs/common';
import { SystemModulesService } from './system-modules.service';
import { CreateModuleDto, UpdateModuleDto, AssignPermissionsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('system-modules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemModulesController {
  constructor(private readonly systemModulesService: SystemModulesService) {}

  /**
   * Crea un nuevo módulo del sistema (solo ADMIN)
   */
  @Post()
  @Roles('ADMIN')
  create(@Body() createModuleDto: CreateModuleDto) {
    return this.systemModulesService.create(createModuleDto);
  }

  /**
   * Lista todos los módulos (árbol jerárquico)
   */
  @Get()
  @Roles('ADMIN')
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.systemModulesService.findAll(includeInactive || false);
  }

  /**
   * Obtiene el menú del usuario actual
   */
  @Get('menu')
  getUserMenu(@CurrentUser() user: any) {
    return this.systemModulesService.getUserMenu(user.userId);
  }

  /**
   * Obtiene un módulo por ID
   */
  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemModulesService.findOne(id);
  }

  /**
   * Actualiza un módulo
   */
  @Put(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateModuleDto: UpdateModuleDto,
  ) {
    return this.systemModulesService.update(id, updateModuleDto);
  }

  /**
   * Elimina un módulo (soft delete)
   */
  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemModulesService.remove(id);
  }

  /**
   * Asigna permisos a un rol
   */
  @Post('permissions')
  @Roles('ADMIN')
  assignPermissions(@Body() assignPermissionsDto: AssignPermissionsDto) {
    return this.systemModulesService.assignPermissions(assignPermissionsDto);
  }

  /**
   * Obtiene los permisos de un rol
   */
  @Get('permissions/role/:roleId')
  @Roles('ADMIN')
  getRolePermissions(@Param('roleId', ParseUUIDPipe) roleId: string) {
    return this.systemModulesService.getRolePermissions(roleId);
  }
}
