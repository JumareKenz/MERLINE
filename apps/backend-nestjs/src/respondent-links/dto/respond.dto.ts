import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TRANSCRIPTION_LANGUAGE_CODES } from '../../transcripts/languages';

export class RespondentDetailsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /** Their role or position, e.g. "District health officer". */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organisation?: string;
}

export class RespondentConsentDto {
  @IsBoolean() allowRecording: boolean;
  @IsBoolean() allowTranscription: boolean;
  @IsBoolean() allowAiAnalysis: boolean;
  @IsBoolean() allowQuotation: boolean;
  @IsBoolean() allowPublication: boolean;
}

/**
 * Starts a respondent's session. The id and secret are made on the
 * respondent's device, so a retry after a dropped response is harmless.
 */
export class StartRespondentSessionDto {
  @IsUUID() sessionId: string;

  /** At least 32 url-safe characters; only its hash is stored. */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{32,128}$/)
  secret: string;

  @ValidateNested()
  @Type(() => RespondentDetailsDto)
  respondent: RespondentDetailsDto;

  @ValidateNested()
  @Type(() => RespondentConsentDto)
  consent: RespondentConsentDto;

  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}

export class RespondentAnswerEntryDto {
  @IsUUID() questionId: string;

  @IsIn(['ASKED', 'SKIPPED'])
  status: 'ASKED' | 'SKIPPED';

  /** Position in the recording when the question was shown. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 3600 * 1000)
  atMs?: number;

  @IsOptional()
  @IsUUID()
  recordingRef?: string;

  /**
   * Ignored. Questions are answered out loud; nothing is chosen from a
   * list. Still accepted so a page opened before that rule (an old tab)
   * does not have its whole batch of marks rejected.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  selected?: number[];

  /** Ignored, like `selected`. */
  @IsOptional()
  @IsInt()
  value?: number;

  @IsDateString()
  markedAt: string;
}

export class RespondentAnswersDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RespondentAnswerEntryDto)
  entries: RespondentAnswerEntryDto[];
}

export class CompleteRespondentUploadDto {
  @IsInt()
  @Min(1)
  @Max(4096)
  totalParts: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;
}
