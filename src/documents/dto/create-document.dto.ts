import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateDocumentDto {
  @IsUUID()
  thesisId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
