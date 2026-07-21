import { IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';

export class SetTargetDto {
  @IsNumber()
  value: number;

  @IsDateString()
  deadline: string;

  @IsString()
  @IsOptional()
  note?: string;
}
