import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { INTERVIEW_TYPE_KEY } from '../common/research/interview-type';

export class TypeFieldDto {
  @IsString()
  @Matches(/^[a-z][a-zA-Z0-9]{0,29}$/, { message: 'Field key must be camelCase letters and digits' })
  key: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsIn(['text', 'number', 'select'])
  kind: 'text' | 'number' | 'select';

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  options?: string[];
}

export class ProjectInterviewTypeDto {
  @Matches(INTERVIEW_TYPE_KEY, {
    message: 'Key must be 2–30 capital letters, digits or underscores, e.g. FGD or WATER_POINT_VISIT',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TypeFieldDto)
  fields?: TypeFieldDto[];
}

export class SetProjectInterviewTypesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProjectInterviewTypeDto)
  types: ProjectInterviewTypeDto[];
}
