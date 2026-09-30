import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  Matches,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { INTERVIEW_TYPE_KEY } from '../../common/research/interview-type';
import { TRANSCRIPTION_LANGUAGE_CODES } from '../../transcripts/languages';

export class CreateRespondentLinkDto {
  @IsUUID() projectId: string;

  /** An approved (or once-approved) guide: its exact version is used. */
  @IsUUID() questionSetId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intro?: string;

  /** Left out: the standard wording (see link-defaults.ts). */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  consentText?: string;

  @IsOptional()
  @Matches(INTERVIEW_TYPE_KEY, { message: 'Invalid interview type' })
  interviewType?: string;

  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;

  /** A personal link: the respondent's name, prefilled for them. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  respondentName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxResponses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/** Every field optional; `null` clears the nullable ones. */
export class UpdateRespondentLinkDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intro?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  consentText?: string;

  @IsOptional()
  @IsUUID()
  questionSetId?: string;

  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  respondentName?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxResponses?: number | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
