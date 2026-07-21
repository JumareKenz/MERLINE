import { Module } from '@nestjs/common';
import { StudiesController } from './studies.controller';
import { StudyTeamsController } from './study-teams.controller';
import { StudiesService } from './studies.service';
import { StudyTeamsService } from './study-teams.service';

@Module({
  controllers: [StudiesController, StudyTeamsController],
  providers: [StudiesService, StudyTeamsService],
  exports: [StudiesService, StudyTeamsService],
})
export class StudiesModule {}
