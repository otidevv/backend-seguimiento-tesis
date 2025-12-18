import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  MaxLength,
  IsEnum,
} from 'class-validator';

export enum ResolutionType {
  APROBACION_PROYECTO = 'APROBACION_PROYECTO',
  DESIGNACION_JURADO = 'DESIGNACION_JURADO',
  DESIGNACION_ASESOR = 'DESIGNACION_ASESOR',
  APROBACION_BORRADOR = 'APROBACION_BORRADOR',
  PROGRAMACION_SUSTENTACION = 'PROGRAMACION_SUSTENTACION',
  APROBACION_TESIS = 'APROBACION_TESIS',
  DIPLOMA_GRADO = 'DIPLOMA_GRADO',
  OTRO = 'OTRO',
}

export class CreateResolutionDto {
  @IsUUID('4')
  thesisId: string;

  @IsString()
  @MaxLength(50)
  resolutionNumber: string;

  @IsEnum(ResolutionType)
  type: ResolutionType;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentUrl?: string;

  @IsDateString()
  issuedAt: string;
}
