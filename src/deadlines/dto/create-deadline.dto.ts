import { IsUUID, IsEnum, IsDateString, IsOptional, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { DeadlineType } from '@prisma/client';

export class CreateDeadlineDto {
  @IsUUID('4', { message: 'ID de tesis inválido' })
  thesisId: string;

  @IsEnum(DeadlineType, { message: 'Tipo de plazo inválido' })
  type: DeadlineType;

  @IsDateString({}, { message: 'Fecha límite inválida' })
  dueDate: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  businessDays?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  calendarDays?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
