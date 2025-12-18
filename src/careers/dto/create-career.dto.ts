import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCareerDto {
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

  @IsUUID()
  @IsNotEmpty()
  facultyId: string;
}
