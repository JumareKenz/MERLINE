import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class FieldLoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(16)
  code: string;
}
