import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { ProjectActivitiesService } from './project-activities.service';

/** PHASE 2 — tenant-scoped and permission-checked (was neither). */
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/activities')
export class ProjectActivitiesController {
  constructor(
    private readonly projectActivitiesService: ProjectActivitiesService,
  ) {}

  @Get()
  @Permissions('view.projects')
  async getActivities(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectActivitiesService.findByProject(
      projectId,
      user.organizationId,
    );
  }
}
