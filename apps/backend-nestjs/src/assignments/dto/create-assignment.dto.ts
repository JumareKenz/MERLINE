import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { AssignmentStatus } from '@prisma/client';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  studyId: string;

  @IsString()
  @IsNotEmpty()
  enumeratorId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;
}
