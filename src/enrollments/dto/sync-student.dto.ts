import { IsString, Length } from 'class-validator';

export class SyncStudentDto {
  @IsString()
  @Length(8, 8, { message: 'El número de documento debe tener 8 dígitos' })
  documentNumber: string;
}
