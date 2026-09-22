import { IsEnum } from 'class-validator';
import { InterviewStatus } from '@prisma/client';

export class UpdateInterviewStatusDto {
  @IsEnum(InterviewStatus)
  status: InterviewStatus;
}
