import { IsString, IsUUID, MaxLength, IsOptional, IsEnum } from 'class-validator';

export enum NotificationType {
  THESIS_STATUS_CHANGED = 'THESIS_STATUS_CHANGED',
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
  DEADLINE_EXPIRED = 'DEADLINE_EXPIRED',
  NEW_COMMENT = 'NEW_COMMENT',
  NEW_REVIEW = 'NEW_REVIEW',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  JURY_ASSIGNED = 'JURY_ASSIGNED',
  GENERAL = 'GENERAL',
}

export class CreateNotificationDto {
  @IsUUID('4', { message: 'ID de usuario inválido' })
  userId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(1000)
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsUUID('4')
  @IsOptional()
  relatedThesisId?: string;
}
