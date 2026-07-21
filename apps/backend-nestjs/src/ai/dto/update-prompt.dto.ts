import { IsOptional, IsString, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePromptDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  @Type(() => Number)
  temperature?: number;

  @IsInt()
  @Min(1)
  @Max(128000)
  @IsOptional()
  @Type(() => Number)
  maxTokens?: number;
}
