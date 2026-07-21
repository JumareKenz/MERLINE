import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectTeamsService } from './project-teams.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/team')
export class ProjectTeamsController {
  constructor(private readonly projectTeamsService: ProjectTeamsService) {}

  @Get()
  async getTeam(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectTeamsService.findByProject(projectId);
  }

  @Post()
  async addMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.projectTeamsService.addMember(projectId, body.userId, body.role);
  }

  @Put(':userId')
  async updateMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { role: string },
  ) {
    return this.projectTeamsService.updateMember(projectId, userId, body.role);
  }

  @Delete(':userId')
  async removeMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.projectTeamsService.removeMember(projectId, userId);
  }
}
