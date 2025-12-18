import { IsUUID, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionAction } from '@prisma/client';

export class PermissionDto {
  @IsUUID('4', { message: 'ID de módulo inválido' })
  moduleId: string;

  @IsEnum(PermissionAction, { message: 'Acción de permiso inválida' })
  action: PermissionAction;
}

export class AssignPermissionsDto {
  @IsUUID('4', { message: 'ID de rol inválido' })
  roleId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
