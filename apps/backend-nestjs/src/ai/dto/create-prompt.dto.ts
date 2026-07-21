import { IsNotEmpty, IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromptDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  content: string;

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
