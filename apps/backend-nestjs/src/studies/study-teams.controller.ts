import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StudyTeamsService } from './study-teams.service';

@UseGuards(JwtAuthGuard)
@Controller('studies/:studyId/team')
export class StudyTeamsController {
  constructor(private readonly studyTeamsService: StudyTeamsService) {}

  @Get()
  async getTeam(@Param('studyId', ParseUUIDPipe) studyId: string) {
    return this.studyTeamsService.findByStudy(studyId);
  }

  @Post()
  async addMember(
    @Param('studyId', ParseUUIDPipe) studyId: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.studyTeamsService.addMember(studyId, body.userId, body.role);
  }

  @Delete(':userId')
  async removeMember(
    @Param('studyId', ParseUUIDPipe) studyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.studyTeamsService.removeMember(studyId, userId);
  }
}
