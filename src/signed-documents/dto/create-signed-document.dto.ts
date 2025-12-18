import { IsString, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateSignedDocumentDto {
  @IsUUID()
  thesisId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
