import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateOptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
