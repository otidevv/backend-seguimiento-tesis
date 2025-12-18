import { IsEnum, IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export enum PresidentDecisionEnum {
  OBSERVADA = 'OBSERVADA',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
}

export class PresidentDecisionDto {
  @IsUUID('4', { message: 'ID de tesis inválido' })
  thesisId: string;

  @IsEnum(PresidentDecisionEnum, {
    message: 'La decisión debe ser OBSERVADA, APROBADA o RECHAZADA',
  })
  decision: PresidentDecisionEnum;

  @IsString({ message: 'El motivo es requerido' })
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'El motivo no puede exceder 1000 caracteres' })
  reason: string;
}
