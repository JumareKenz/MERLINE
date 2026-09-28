import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * An access code: a name for it (a team, a place, or a person) and the
 * projects it opens. Any number of enumerators can sign in with it; each
 * interview records who conducted it.
 */
export class CreateAccessCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  projectIds: string[];
}

export class RenameAccessCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class SetFieldWorkerProjectsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  projectIds: string[];
}
