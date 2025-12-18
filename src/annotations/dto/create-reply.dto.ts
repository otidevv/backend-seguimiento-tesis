import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateReplyDto {
  @IsUUID()
  annotationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
