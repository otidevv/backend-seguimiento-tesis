import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ThesisStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(ThesisStatus, { message: 'Estado de tesis inválido' })
  newStatus: ThesisStatus;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @IsString()
  @IsOptional()
  metadata?: string; // JSON string con datos adicionales
}
