import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectTeamsController } from './project-teams.controller';
import { ProjectTagsController } from './project-tags.controller';
import { ProjectActivitiesController } from './project-activities.controller';
import { ProjectsService } from './projects.service';
import { ProjectTeamsService } from './project-teams.service';
import { ProjectTagsService } from './project-tags.service';
import { ProjectActivitiesService } from './project-activities.service';

@Module({
  controllers: [
    ProjectsController,
    ProjectTeamsController,
    ProjectTagsController,
    ProjectActivitiesController,
  ],
  providers: [
    ProjectsService,
    ProjectTeamsService,
    ProjectTagsService,
    ProjectActivitiesService,
  ],
  exports: [
    ProjectsService,
    ProjectTeamsService,
    ProjectTagsService,
    ProjectActivitiesService,
  ],
})
export class ProjectsModule {}
