import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { ProjectTagsService } from './project-tags.service';

/** PHASE 2 — tenant-scoped and permission-checked (was neither). */
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/tags')
export class ProjectTagsController {
  constructor(private readonly projectTagsService: ProjectTagsService) {}

  @Get()
  @Permissions('view.projects')
  async getTags(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectTagsService.findByProject(
      projectId,
      user.organizationId,
    );
  }

  @Post()
  @Permissions('edit.projects')
  async createTag(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { name: string; color?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectTagsService.createTag(
      projectId,
      body.name,
      user.organizationId,
      body.color,
    );
  }

  @Delete(':id')
  @Permissions('edit.projects')
  async deleteTag(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectTagsService.deleteTag(
      projectId,
      id,
      user.organizationId,
    );
  }
}
