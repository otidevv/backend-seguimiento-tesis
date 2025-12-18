import { IsUUID, IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ReviewDecision } from '@prisma/client';

export class CreateReviewDto {
  @IsUUID('4', { message: 'ID de tesis inválido' })
  thesisId: string;

  @IsEnum(ReviewDecision, { message: 'Decisión de dictamen inválida' })
  decision: ReviewDecision;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  observations?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comments?: string;
}
