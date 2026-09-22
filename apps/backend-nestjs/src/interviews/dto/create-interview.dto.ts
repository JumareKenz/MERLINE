import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateInterviewDto {
  @IsUUID()
  @IsNotEmpty()
  participantId: string;

  /**
   * Required: an interview cannot be created without a consent record already
   * on file for this participant. There is deliberately no path that creates
   * a blank/placeholder consent alongside the interview.
   */
  @IsUUID()
  @IsNotEmpty()
  consentId: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  /** Defaults to the caller if omitted. */
  @IsUUID()
  @IsOptional()
  interviewerId?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  notes?: string;
}
