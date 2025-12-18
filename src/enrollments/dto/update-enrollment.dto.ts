import { IsString, IsUUID, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsUUID()
  careerId?: string;

  @IsOptional()
  @IsString()
  studentCode?: string;

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
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  syncedFromExternalApi?: boolean;

  @IsOptional()
  @IsString()
  externalApiData?: string;
}
