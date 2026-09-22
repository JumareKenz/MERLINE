import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddQuotationDto {
  @IsUUID()
  @IsNotEmpty()
  transcriptSegmentId: string;

  /** Must appear verbatim in the segment's text — see FindingsService.addQuotation. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  excerpt: string;
}
