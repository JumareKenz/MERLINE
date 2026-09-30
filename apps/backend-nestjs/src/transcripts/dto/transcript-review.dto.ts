import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * A reviewer's change to one segment. Every field is optional; `null`
 * puts the machine value back (text, speaker) or clears it (flag, note).
 */
export class ReviewSegmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  text?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  speakerLabel?: string | null;

  @IsOptional()
  @IsBoolean()
  flagged?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  flagReason?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class RenameSpeakerDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  from: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  to: string;
}

export class SubmitReviewDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ApproveTranscriptDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;

  /** Approve although passages are still flagged uncertain or inaudible. */
  @IsOptional()
  @IsBoolean()
  acknowledgeFlags?: boolean;

  /** Approve without the enumerator's review; a note explaining why is required. */
  @IsOptional()
  @IsBoolean()
  skipEnumeratorReview?: boolean;
}

export class ReviewNoteDto {
  @Transform(trim)
  @IsString()
  @MinLength(5, {
    message: 'Add a note of at least 5 characters so the reason is on record',
  })
  @MaxLength(2000)
  note: string;
}

export class CompareRevisionsQuery {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  from?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  to?: number;
}
