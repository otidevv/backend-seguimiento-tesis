import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class UpdateCareerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  externalName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  facultyId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
