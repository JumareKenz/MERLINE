import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateQuestionnaireDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsNotEmpty()
  studyId: string;
}
