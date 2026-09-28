import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class FieldLoginDto {
  @IsString()
  @IsNotEmpty()
  // 4 characters now; legacy codes were 10 (XXXXX-XXXXX).
  @MinLength(4)
  @MaxLength(16)
  code: string;
}
