import { IsDateString, IsString, IsOptional, MaxLength } from 'class-validator';

export class ExtendDeadlineDto {
  @IsDateString({}, { message: 'Nueva fecha límite inválida' })
  newDueDate: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
