import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Letters (any script), spaces, apostrophes, hyphens and full stops. */
const NAME = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
/** International-style numbers: optional +, digits, spaces, dashes, brackets. */
const PHONE = /^\+?[0-9][0-9 ()-]{6,18}[0-9]$/;

export class CreateEnumeratorDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(NAME, { message: 'Full name may contain letters, spaces, apostrophes and hyphens' })
  fullName: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email?: string;

  @Transform(trim)
  @IsString()
  @Matches(PHONE, { message: 'Enter a valid phone number, e.g. +234 803 000 0000' })
  phone: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  state: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  projectIds?: string[];

  /** Days until the first access code expires; omit for no expiry. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  codeValidDays?: number;
}

export class UpdateEnumeratorDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(NAME, { message: 'Full name may contain letters, spaces, apostrophes and hyphens' })
  fullName?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(PHONE, { message: 'Enter a valid phone number, e.g. +234 803 000 0000' })
  phone?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class SetEnumeratorActiveDto {
  @IsBoolean()
  isActive: boolean;
}

export class EnumeratorProjectsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  projectIds: string[];
}

export class IssueAccessCodeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  validDays?: number;
}

export class RevokeAccessCodeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ListEnumeratorsQuery {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @Transform(trim)
  @IsString()
  state?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsIn(['NONE', 'ACTIVE', 'UNUSED', 'EXPIRED', 'REVOKED'])
  codeStatus?: 'NONE' | 'ACTIVE' | 'UNUSED' | 'EXPIRED' | 'REVOKED';

  @IsOptional()
  @IsIn(['name', 'createdAt', 'lastActivity', 'state'])
  sortBy?: 'name' | 'createdAt' | 'lastActivity' | 'state';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
