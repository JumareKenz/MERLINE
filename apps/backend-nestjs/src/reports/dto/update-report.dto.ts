import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateReportDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}
