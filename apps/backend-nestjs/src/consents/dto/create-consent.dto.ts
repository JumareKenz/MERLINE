import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ConsentMethod } from '@prisma/client';

export class CreateConsentDto {
  @IsUUID()
  @IsNotEmpty()
  participantId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @IsEnum(ConsentMethod)
  method: ConsentMethod;

  @IsBoolean()
  @IsOptional()
  allowRecording?: boolean;

  @IsBoolean()
  @IsOptional()
  allowTranscription?: boolean;

  @IsBoolean()
  @IsOptional()
  allowAiAnalysis?: boolean;

  @IsBoolean()
  @IsOptional()
  allowQuotation?: boolean;

  @IsBoolean()
  @IsOptional()
  allowPublication?: boolean;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
