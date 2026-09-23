import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TRANSCRIPTION_LANGUAGE_CODES } from '../../transcripts/languages';
import { ConsentMethod } from '@prisma/client';

export class FieldParticipantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalRef?: string;
}

export class FieldConsentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @IsEnum(ConsentMethod)
  method: ConsentMethod;

  @IsBoolean() allowRecording: boolean;
  @IsBoolean() allowTranscription: boolean;
  @IsBoolean() allowAiAnalysis: boolean;
  @IsBoolean() allowQuotation: boolean;
  @IsBoolean() allowPublication: boolean;

  /** When the participant gave consent, on the device. */
  @IsDateString()
  capturedAt: string;
}

/**
 * One interview started on site: the participant, their consent and the
 * interview, created together. Ids are generated on the device so the call
 * is idempotent — the field app may send it again after a dropped
 * response, or hours later when it regains a connection.
 */
export class CreateFieldInterviewDto {
  @IsUUID() interviewId: string;
  @IsUUID() participantId: string;
  @IsUUID() consentId: string;
  @IsUUID() projectId: string;

  @ValidateNested()
  @Type(() => FieldParticipantDto)
  participant: FieldParticipantDto;

  @ValidateNested()
  @Type(() => FieldConsentDto)
  consent: FieldConsentDto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  /** Language spoken, if known: used as the transcription hint. */
  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}
