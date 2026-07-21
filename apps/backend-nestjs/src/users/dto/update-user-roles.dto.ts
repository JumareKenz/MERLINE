import { IsArray, IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsNotEmpty()
  roleIds: string[];
}
