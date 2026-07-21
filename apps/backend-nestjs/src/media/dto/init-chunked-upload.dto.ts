import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { MediaType } from '@prisma/client';

export class InitChunkedUploadDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  totalSize: number;

  @IsNumber()
  totalChunks: number;

  @IsEnum(MediaType)
  @IsOptional()
  type?: MediaType;

  @IsString()
  @IsOptional()
  submissionId?: string;

  @IsString()
  @IsOptional()
  checksum?: string;
}
