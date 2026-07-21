import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StudyStatus } from '@prisma/client';

export class TransitionStudyDto {
  @IsEnum(StudyStatus)
  status: StudyStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
