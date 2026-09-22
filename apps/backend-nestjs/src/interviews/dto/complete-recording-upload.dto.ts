import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Completes a resumable recording upload started by the field app. */
export class CompleteRecordingUploadDto {
  @IsInt()
  @Min(1)
  @Max(4096)
  totalParts: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  originalName: string;

  /** SHA-256 (hex) of the whole recording, computed on the device. */
  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/)
  checksum?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
