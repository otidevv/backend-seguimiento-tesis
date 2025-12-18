import {
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { AnnotationType } from '@prisma/client';

export class CreateAnnotationDto {
  @IsUUID()
  documentId: string;

  @IsUUID()
  thesisId: string;

  @IsEnum(AnnotationType)
  type: AnnotationType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content?: string;

  @IsString()
  color: string;

  @IsInt()
  @Min(1)
  pageNumber: number;

  @IsOptional()
  @IsString()
  textRanges?: string; // JSON string for highlights

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  y?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  height?: number;
}

export class UpdateAnnotationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  y?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  height?: number;
}
