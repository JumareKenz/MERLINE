import { IsString, IsOptional, IsNumber, IsObject, IsArray, IsBoolean } from 'class-validator';

export class UpdateIndicatorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;

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
}
