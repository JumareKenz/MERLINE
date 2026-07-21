import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsBoolean } from 'class-validator';
import { StudyType } from '@prisma/client';

export class UpdateStudyDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(StudyType)
  @IsOptional()
  type?: StudyType;

  @IsObject()
  @IsOptional()
  studyDesign?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  location?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  targetDetails?: Record<string, unknown>;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;
}
