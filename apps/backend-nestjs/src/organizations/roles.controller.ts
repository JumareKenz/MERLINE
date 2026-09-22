import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

/**
 * PHASE 2 — authorization added. No route here carried @Permissions, so any
 * signed-in user (a field interviewer included) could create roles, rename
 * them, or rewrite any role's permissions — including their own role's —
 * which is a complete privilege escalation within the organization.
 */
@UseGuards(JwtAuthGuard)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('organizations/:orgId/roles')
  @Permissions('view.roles')
  findAll(@Param('orgId') orgId: string) {
    return this.rolesService.findAll(orgId);
  }

  @Get('roles')
  @Permissions('view.roles')
  findAllFlat(@CurrentUser() user: any) {
    return this.rolesService.findAll(user.organizationId);
  }

  @Get('roles/:id')
  @Permissions('view.roles')
  findById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.findById(id, user.organizationId);
  }

  @Post('organizations/:orgId/roles')
  @Permissions('create.roles')
  create(@Param('orgId') orgId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(orgId, dto);
  }

  @Post('roles')
  @Permissions('create.roles')
  createFlat(@Body() dto: CreateRoleDto, @CurrentUser() user: any) {
    return this.rolesService.create(user.organizationId, dto);
  }

  @Put('organizations/:orgId/roles/:id')
  @Permissions('edit.roles')
  update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(orgId, id, dto);
  }

  @Put('roles/:id')
  @Permissions('edit.roles')
  updateFlat(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.update(user.organizationId, id, dto);
  }

  @Delete('organizations/:orgId/roles/:id')
  @Permissions('delete.roles')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.rolesService.remove(orgId, id);
  }

  @Delete('roles/:id')
  @Permissions('delete.roles')
  removeFlat(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.remove(user.organizationId, id);
  }

  @Put('organizations/:orgId/roles/:id/permissions')
  @Permissions('edit.roles')
  updatePermissions(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(orgId, id, dto.permissionIds);
  }
}
