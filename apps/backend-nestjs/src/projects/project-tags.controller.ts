import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectTagsService } from './project-tags.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/tags')
export class ProjectTagsController {
  constructor(private readonly projectTagsService: ProjectTagsService) {}

  @Get()
  async getTags(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectTagsService.findByProject(projectId);
  }

  @Post()
  async createTag(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { name: string; color?: string },
  ) {
    return this.projectTagsService.createTag(projectId, body.name, body.color);
  }

  @Delete(':id')
  async deleteTag(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectTagsService.deleteTag(projectId, id);
  }
}
