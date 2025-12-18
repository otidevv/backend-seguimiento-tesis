import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { AcademicDegree } from '@prisma/client';

export class CreateThesisDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es requerido' })
  @MaxLength(500)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(AcademicDegree, { message: 'Grado académico inválido' })
  academicDegree: AcademicDegree;

  @IsUUID('4', { message: 'ID de carrera inválido' })
  careerId: string;

  @IsUUID('4', { message: 'ID de co-autor inválido' })
  @IsOptional()
  coAuthorId?: string;

  @IsUUID('4', { message: 'ID de asesor inválido' })
  advisorId: string;

  @IsUUID('4', { message: 'ID de co-asesor inválido' })
  @IsOptional()
  coAdvisorId?: string;
}
