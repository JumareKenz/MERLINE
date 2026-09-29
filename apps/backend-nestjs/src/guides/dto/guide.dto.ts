import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmpty,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { INTERVIEW_TYPES } from '../../common/research/interview-type';
import { OPEN_ONLY_MESSAGE, QUESTION_TYPES } from '../guide-import';

export class GuideQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  section?: string;

  /** {"en": "...", "ha": "..."}; English is required. */
  @IsObject()
  text: Record<string, string>;

  /** Only open questions exist. Optional so a plain question needs no type. */
  @IsOptional()
  @IsIn(QUESTION_TYPES, { message: OPEN_ONLY_MESSAGE })
  type?: string;

  // The three below are rejected rather than dropped: a client that still
  // sends them (an old browser tab, a script) is told why, instead of
  // having its choices silently discarded.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(0, { message: OPEN_ONLY_MESSAGE })
  options?: Record<string, string>[];

  @IsOptional()
  @IsEmpty({ message: OPEN_ONLY_MESSAGE })
  scaleMin?: number;

  @IsOptional()
  @IsEmpty({ message: OPEN_ONLY_MESSAGE })
  scaleMax?: number;

  @IsOptional()
  @IsObject()
  probes?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class SaveGuideDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsIn(INTERVIEW_TYPES)
  interviewType: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  languages: string[];

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => GuideQuestionDto)
  questions: GuideQuestionDto[];

  /** Only read when a guide is created; versions inherit it. */
  @IsOptional()
  @IsBoolean()
  linkOnly?: boolean;
}

/** Multipart fields that accompany an uploaded CSV/XLSX file. */
export class ImportGuideDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsIn(INTERVIEW_TYPES)
  interviewType: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  /** For self-interview links only (never the field teams' guide). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  linkOnly?: boolean;
}
