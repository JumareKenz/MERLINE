import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFindingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  interpretation: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  theme?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;
}
