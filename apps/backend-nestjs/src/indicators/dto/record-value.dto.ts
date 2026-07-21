import { IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';

export class RecordValueDto {
  @IsNumber()
  value: number;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  note?: string;
}
