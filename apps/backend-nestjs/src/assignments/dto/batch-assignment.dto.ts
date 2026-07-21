import { IsArray, ValidateNested, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class BatchItem {
  @IsString()
  @IsNotEmpty()
  studyId: string;

  @IsString()
  @IsNotEmpty()
  enumeratorId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BatchAssignmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchItem)
  assignments: BatchItem[];
}
