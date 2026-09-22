import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsService } from './permissions.service';
import { Permissions } from '../common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('organizations/:orgId/permissions')
  @Permissions('view.roles')
  findAll(@Param('orgId') orgId: string) {
    return this.permissionsService.findAll(orgId);
  }

  @Get('roles/permissions')
  @Permissions('view.roles')
  findAllFlat(@CurrentUser() user: any) {
    return this.permissionsService.findAll(user.organizationId);
  }
}
