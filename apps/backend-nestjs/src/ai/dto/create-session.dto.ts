import { IsOptional, IsString, IsObject, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}
