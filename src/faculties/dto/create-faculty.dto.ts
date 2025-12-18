import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateFacultyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  externalName?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
