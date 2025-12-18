import { IsUUID, IsEnum, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { JuryRole } from '@prisma/client';

export class JuryMemberDto {
  @IsUUID('4', { message: 'ID de usuario inválido' })
  userId: string;

  @IsEnum(JuryRole, { message: 'Rol de jurado inválido' })
  role: JuryRole;
}

export class AssignJuryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(3, { message: 'Se requieren al menos 3 miembros del jurado' })
  @Type(() => JuryMemberDto)
  juryMembers: JuryMemberDto[];
}
