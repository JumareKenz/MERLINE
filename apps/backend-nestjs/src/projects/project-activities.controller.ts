import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectActivitiesService } from './project-activities.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/activities')
export class ProjectActivitiesController {
  constructor(private readonly projectActivitiesService: ProjectActivitiesService) {}

  @Get()
  async getActivities(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectActivitiesService.findByProject(projectId);
  }
}
