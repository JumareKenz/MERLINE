import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTranscriptDto {
  @IsUUID()
  @IsNotEmpty()
  interviewId: string;

  @IsUUID()
  @IsNotEmpty()
  mediaId: string;
}
