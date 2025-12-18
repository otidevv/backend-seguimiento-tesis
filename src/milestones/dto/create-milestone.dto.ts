import { IsString, IsUUID, IsOptional, IsInt, IsDateString, Min } from 'class-validator';

export class CreateMilestoneDto {
  @IsUUID()
  thesisId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
