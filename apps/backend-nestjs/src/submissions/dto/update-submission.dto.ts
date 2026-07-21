import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class UpdateSubmissionDto {
  @IsObject()
  @IsOptional()
  answers?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  location?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  qualityScore?: number;
}
