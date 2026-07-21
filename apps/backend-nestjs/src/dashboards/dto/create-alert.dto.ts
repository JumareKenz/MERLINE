import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsOptional()
  meta?: Record<string, unknown>;
}
