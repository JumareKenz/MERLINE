import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject, IsArray } from 'class-validator';

export class CreateIndicatorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  calculation?: string;

  @IsNumber()
  @IsOptional()
  baseline?: number;

  @IsNumber()
  @IsOptional()
  target?: number;

  @IsString()
  @IsOptional()
  dataSource?: string;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsArray()
  @IsOptional()
  disaggregation?: unknown[];

  @IsNumber()
  @IsOptional()
  thresholdWarning?: number;

  @IsNumber()
  @IsOptional()
  thresholdCritical?: number;

  @IsString()
  @IsNotEmpty()
  studyId: string;
}
