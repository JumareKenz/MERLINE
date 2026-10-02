import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { INTERVIEW_TYPE_KEY } from '../../common/research/interview-type';
import { TRANSCRIPTION_LANGUAGE_CODES } from '../../transcripts/languages';

export class RequestReportDto {
  @IsIn(['INTERVIEW', 'PROJECT', 'CUSTOM'])
  scope: 'INTERVIEW' | 'PROJECT' | 'CUSTOM';

  @ValidateIf((o: RequestReportDto) => o.scope === 'INTERVIEW')
  @IsUUID()
  interviewId?: string;

  @ValidateIf((o: RequestReportDto) => o.scope !== 'INTERVIEW')
  @IsUUID()
  projectId?: string;

  /** What to produce (CUSTOM): audience, length, structure, emphasis. */
  @ValidateIf((o: RequestReportDto) => o.scope === 'CUSTOM')
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  instructions?: string;

  /** Limit a project report or brief to one interview type, e.g. "FGD". */
  @IsOptional()
  @Matches(INTERVIEW_TYPE_KEY, { message: 'Invalid interview type' })
  interviewType?: string;

  /** Language the report is written in (quotations keep their own). */
  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}

export class AskProjectDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  question: string;

  @IsOptional()
  @IsIn(TRANSCRIPTION_LANGUAGE_CODES)
  language?: string;
}
