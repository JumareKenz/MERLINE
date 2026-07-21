import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsObject } from 'class-validator';
import { StudyType } from '@prisma/client';

export class CreateStudyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

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

  @IsString()
  @IsNotEmpty()
  projectId: string;
}
