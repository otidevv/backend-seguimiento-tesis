import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  thesisId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
