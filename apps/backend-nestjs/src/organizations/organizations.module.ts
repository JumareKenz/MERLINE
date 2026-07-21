import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  controllers: [
    OrganizationsController,
    RolesController,
    PermissionsController,
    WorkspacesController,
  ],
  providers: [
    OrganizationsService,
    RolesService,
    PermissionsService,
    WorkspacesService,
  ],
  exports: [
    OrganizationsService,
    RolesService,
    PermissionsService,
    WorkspacesService,
  ],
})
export class OrganizationsModule {}
