import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateParticipantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName: string;

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
