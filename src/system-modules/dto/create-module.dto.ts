import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre técnico es requerido' })
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre para mostrar es requerido' })
  @MaxLength(100)
  displayName: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  route?: string;

  @IsUUID('4', { message: 'ID de módulo padre inválido' })
  @IsOptional()
  parentId?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
