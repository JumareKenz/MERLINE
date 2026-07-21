import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsService } from './permissions.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('organizations/:orgId/permissions')
  findAll(@Param('orgId') orgId: string) {
    return this.permissionsService.findAll(orgId);
  }

  @Get('roles/permissions')
  findAllFlat(@CurrentUser() user: any) {
    return this.permissionsService.findAll(user.organizationId);
  }
}
