import { IsString, IsOptional, IsInt } from 'class-validator';

export class UpdateOptionDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
