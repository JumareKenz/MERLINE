import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { ProjectTeamsService } from './project-teams.service';

/** PHASE 2 — tenant-scoped and permission-checked (was neither). */
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/team')
export class ProjectTeamsController {
  constructor(private readonly projectTeamsService: ProjectTeamsService) {}

  @Get()
  @Permissions('view.projects')
  async getTeam(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectTeamsService.findByProject(
      projectId,
      user.organizationId,
    );
  }

  @Post()
  @Permissions('edit.projects')
  async addMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { userId: string; role?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectTeamsService.addMember(
      projectId,
      body.userId,
      user.organizationId,
      body.role,
    );
  }

  @Put(':userId')
  @Permissions('edit.projects')
  async updateMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { role: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectTeamsService.updateMember(
      projectId,
      userId,
      body.role,
      user.organizationId,
    );
  }

  @Delete(':userId')
  @Permissions('edit.projects')
  async removeMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectTeamsService.removeMember(
      projectId,
      userId,
      user.organizationId,
    );
  }
}
