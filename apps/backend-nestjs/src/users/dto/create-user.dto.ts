import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  /**
   * PHASE 1: `organizationId` is deliberately NOT accepted from the client.
   *
   * It was a required body field, so a caller could create this resource
   * inside another organization simply by supplying that organization's id.
   * The tenant now comes from the authenticated token. With the global
   * ValidationPipe's `forbidNonWhitelisted`, sending it is rejected outright
   * rather than silently ignored.
   */

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  locale?: string;


  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  roleIds?: string[];
}
