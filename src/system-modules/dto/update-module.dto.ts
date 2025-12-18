import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, MaxLength, Min } from 'class-validator';

export class UpdateModuleDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

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
