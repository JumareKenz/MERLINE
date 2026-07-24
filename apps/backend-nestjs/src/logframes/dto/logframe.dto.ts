import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export type LogframeLevel = 'outcome' | 'output' | 'activity' | 'input';

export class LogframeRowIndicatorDto {
  @IsString()
  indicatorId: string;

  @IsOptional()
  @IsNumber()
  baseline?: number;

  @IsOptional()
  @IsNumber()
  target?: number;

  @IsOptional()
  @IsNumber()
  actual?: number;
}

export class CreateLogframeRowDto {
  @IsString()
  level: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  meansOfVerification?: string;

  @IsOptional()
  @IsString()
  assumptions?: string;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogframeRowIndicatorDto)
  indicators?: LogframeRowIndicatorDto[];
}

export class UpsertLogframeDto {
  @IsString()
  goal: string;

  @IsOptional()
  @IsString()
  goalNarrative?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLogframeRowDto)
  rows?: CreateLogframeRowDto[];
}

export class UpdateLogframeRowDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  meansOfVerification?: string;

  @IsOptional()
  @IsString()
  assumptions?: string;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}
