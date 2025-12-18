import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
