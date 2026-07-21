import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';

export class PullDto {
  @IsDateString()
  @IsOptional()
  lastSyncedAt?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  entityTypes?: string[];
}
