import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  /**
   * PHASE 1: `organizationId` is deliberately NOT accepted from the client.
   *
   * It was a required body field, so a caller could create this resource
   * inside another organization simply by supplying that organization's id.
   * The tenant now comes from the authenticated token. With the global
   * ValidationPipe's `forbidNonWhitelisted`, sending it is rejected outright
   * rather than silently ignored.
   */

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  settings?: Record<string, unknown>;

  @IsUUID()
  @IsOptional()
  workspaceId?: string;

}
