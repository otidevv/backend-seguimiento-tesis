import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsEmail,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEmail()
  @IsOptional()
  personalEmail?: string | null;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string | null;

  @IsString()
  @IsOptional()
  phone?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  roleIds?: string[];

  @IsUUID('4')
  @IsOptional()
  facultyId?: string | null;
}
