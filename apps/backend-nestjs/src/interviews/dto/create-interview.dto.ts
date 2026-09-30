import {
  IsDateString,
  IsIn,
  IsObject,
  Matches,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TRANSCRIPTION_LANGUAGE_CODES } from '../../transcripts/languages';
import { INTERVIEW_TYPE_KEY } from '../../common/research/interview-type';

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

  /** The guide version to use; defaults to the approved guide for the project and type. */
  @IsOptional()
  @IsUUID()
  questionSetId?: string;

  /** One of the project's interview types (KII, FGD, IDI, HOUSEHOLD, OBSERVATION, OTHER or a custom key). Defaults to the project's method. */
  @IsOptional()
  @Matches(INTERVIEW_TYPE_KEY, { message: 'Invalid interview type' })
  type?: string;

  /** Answers to the interview type's own fields (e.g. group size for an FGD). */
  @IsOptional()
  @IsObject()
  typeMetadata?: Record<string, unknown>;

  /** Language spoken, if known: used as the transcription hint. */
  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}
