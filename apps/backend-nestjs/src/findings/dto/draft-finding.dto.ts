import { IsNotEmpty, IsUUID } from 'class-validator';

export class DraftFindingDto {
  @IsUUID()
  @IsNotEmpty()
  transcriptId: string;
}
