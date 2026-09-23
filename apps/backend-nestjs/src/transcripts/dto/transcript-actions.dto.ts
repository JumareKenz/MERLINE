import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TRANSCRIPTION_LANGUAGE_CODES } from '../languages';

export class RetryTranscriptDto {
  /** Retry with a different language hint (e.g. after detection failed). */
  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}

export class EditSegmentDto {
  /** The corrected text, or null to go back to the machine transcript. */
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(10000)
  text: string | null;
}

export class TranslateTranscriptDto {
  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}
