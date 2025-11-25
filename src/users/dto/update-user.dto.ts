import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsEmail,
  MinLength,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

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
}
