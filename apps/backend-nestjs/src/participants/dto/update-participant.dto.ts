import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateParticipantDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  externalRef?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
