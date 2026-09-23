import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuestionLogEntryDto {
  @IsUUID()
  questionId: string;

  /** CLEAR undoes an earlier mark. */
  @IsIn(['ASKED', 'SKIPPED', 'CLEAR'])
  status: 'ASKED' | 'SKIPPED' | 'CLEAR';

  /** Position in the recording when asked (ms). */
  @IsOptional()
  @IsInt()
  @Min(0)
  atMs?: number;

  /** The device's recording id (becomes the stored recording's upload id). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recordingRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** When it was marked, on the device: the latest mark wins. */
  @IsDateString()
  markedAt: string;
}

export class QuestionLogDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => QuestionLogEntryDto)
  entries: QuestionLogEntryDto[];
}
