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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('organizations/:orgId/roles')
  findAll(@Param('orgId') orgId: string) {
    return this.rolesService.findAll(orgId);
  }

  @Get('roles')
  findAllFlat(@CurrentUser() user: any) {
    return this.rolesService.findAll(user.organizationId);
  }

  @Get('roles/:id')
  findById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.findById(id, user.organizationId);
  }

  @Post('organizations/:orgId/roles')
  create(@Param('orgId') orgId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(orgId, dto);
  }

  @Post('roles')
  createFlat(@Body() dto: CreateRoleDto, @CurrentUser() user: any) {
    return this.rolesService.create(user.organizationId, dto);
  }

  @Put('organizations/:orgId/roles/:id')
  update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(orgId, id, dto);
  }

  @Put('roles/:id')
  updateFlat(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.update(user.organizationId, id, dto);
  }

  @Delete('organizations/:orgId/roles/:id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.rolesService.remove(orgId, id);
  }

  @Delete('roles/:id')
  removeFlat(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.remove(user.organizationId, id);
  }

  @Put('organizations/:orgId/roles/:id/permissions')
  updatePermissions(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(orgId, id, dto.permissionIds);
  }
}
