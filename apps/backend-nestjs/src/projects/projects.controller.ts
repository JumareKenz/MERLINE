import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Permissions('view.projects')
  async findAll(
    // PHASE 1: the tenant comes from the token, never the query string.
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAll({
      organizationId: user.organizationId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Post()
  @Permissions('create.projects')
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  @Permissions('view.projects')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.findById(id, user.organizationId);
  }

  @Put(':id')
  @Permissions('edit.projects')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @Permissions('delete.projects')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.remove(id, user.organizationId);
  }

  @Post(':id/archive')
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.archive(id, user.organizationId);
  }

  @Post(':id/restore')
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.restore(id, user.organizationId);
  }

  @Post(':id/clone')
  async clone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.clone(id, user.id, user.organizationId);
  }

  @Get(':id/timeline')
  async getTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.getTimeline(id, user.organizationId);
  }

  @Get(':id/stats')
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.getStats(id, user.organizationId);
  }
}
