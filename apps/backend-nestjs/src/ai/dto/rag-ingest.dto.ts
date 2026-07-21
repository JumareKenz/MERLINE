import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class RagIngestDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
