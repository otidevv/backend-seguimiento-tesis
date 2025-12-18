import { IsString, IsOptional, IsUUID, MaxLength, IsEnum } from 'class-validator';
import { AcademicDegree } from '@prisma/client';

export class UpdateThesisDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(AcademicDegree, { message: 'Grado académico inválido' })
  @IsOptional()
  academicDegree?: AcademicDegree;

  @IsUUID('4', { message: 'ID de carrera inválido' })
  @IsOptional()
  careerId?: string;

  @IsUUID('4', { message: 'ID de co-autor inválido' })
  @IsOptional()
  coAuthorId?: string;

  @IsUUID('4', { message: 'ID de asesor inválido' })
  @IsOptional()
  advisorId?: string;

  @IsUUID('4', { message: 'ID de co-asesor inválido' })
  @IsOptional()
  coAdvisorId?: string;

  @IsString()
  @IsOptional()
  finalDocument?: string;
}
