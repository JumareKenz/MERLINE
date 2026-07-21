import { IsArray, IsUUID } from 'class-validator';

export class UpdatePermissionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
