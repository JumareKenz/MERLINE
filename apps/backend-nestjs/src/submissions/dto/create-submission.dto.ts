import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class CreateSubmissionDto {
  @IsObject()
  @IsOptional()
  answers?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  location?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  assignmentId?: string;

  @IsString()
  @IsNotEmpty()
  studyId: string;

  @IsString()
  @IsOptional()
  questionnaireId?: string;

  @IsString()
  @IsOptional()
  enumeratorId?: string;
}
