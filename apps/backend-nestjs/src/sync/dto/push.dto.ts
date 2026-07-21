import { IsArray, ValidateNested, IsString, IsNotEmpty, IsEnum, IsObject, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SyncAction } from '@prisma/client';

class PushItem {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsEnum(SyncAction)
  action: SyncAction;

  @IsObject()
  payload: Record<string, unknown>;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  checksum?: string;
}

export class PushDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushItem)
  changes: PushItem[];

  @IsString()
  @IsOptional()
  deviceId?: string;
}
