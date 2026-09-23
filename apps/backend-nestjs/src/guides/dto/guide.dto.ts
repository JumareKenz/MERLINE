import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { INTERVIEW_TYPES } from '../../common/research/interview-type';
import { QUESTION_TYPES } from '../guide-import';

export class GuideQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  section?: string;

  /** {"en": "...", "ha": "..."}; English is required. */
  @IsObject()
  text: Record<string, string>;

  @IsIn(QUESTION_TYPES)
  type: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  options?: Record<string, string>[];

  @IsOptional()
  @IsInt()
  @Min(0)
  scaleMin?: number;

  @IsOptional()
  @IsInt()
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
}
