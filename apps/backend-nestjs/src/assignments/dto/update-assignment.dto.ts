import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AssignmentStatus } from '@prisma/client';

export class UpdateAssignmentDto {
  @IsString()
  @IsOptional()
  studyId?: string;

  @IsString()
  @IsOptional()
  enumeratorId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;
}
