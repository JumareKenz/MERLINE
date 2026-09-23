import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TRANSCRIPTION_LANGUAGE_CODES } from '../../transcripts/languages';

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

  /** Language spoken, if known: used as the transcription hint. */
  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}
