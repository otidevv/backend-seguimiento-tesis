import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  roleIds?: string[];
}
