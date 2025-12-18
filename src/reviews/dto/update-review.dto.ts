import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ReviewDecision } from '@prisma/client';

export class UpdateReviewDto {
  @IsEnum(ReviewDecision, { message: 'Decisión de dictamen inválida' })
  @IsOptional()
  decision?: ReviewDecision;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  observations?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comments?: string;
}
