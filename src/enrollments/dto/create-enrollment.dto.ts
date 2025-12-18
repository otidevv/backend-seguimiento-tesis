import { IsString, IsUUID, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  careerId: string;

  @IsString()
  studentCode: string;

  @IsOptional()
  @IsNumber()
  creditsApproved?: number;

  @IsOptional()
  @IsString()
  lastAcademicPeriod?: string;

  @IsOptional()
  @IsString()
  academicPeriodId?: string;

  @IsOptional()
  @IsBoolean()
  syncedFromExternalApi?: boolean;

  @IsOptional()
  @IsString()
  externalApiData?: string;
}
