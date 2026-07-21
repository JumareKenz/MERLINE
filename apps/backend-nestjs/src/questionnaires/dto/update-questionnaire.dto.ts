import { IsString, IsOptional } from 'class-validator';

export class UpdateQuestionnaireDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  locale?: string;
}
