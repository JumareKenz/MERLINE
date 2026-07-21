import { IsOptional, IsString, IsNotEmpty, IsUUID, IsObject } from 'class-validator';

export class AgentRequestDto {
  @IsUUID()
  @IsOptional()
  studyId?: string;

  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}
