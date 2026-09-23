import { IsIn, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { TRANSCRIPTION_LANGUAGE_CODES } from '../languages';

export class CreateTranscriptDto {
  @IsUUID()
  @IsNotEmpty()
  interviewId: string;

  @IsUUID()
  @IsNotEmpty()
  mediaId: string;

  /** Language hint (e.g. "ha"). Omit to let the model detect it. */
  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}
