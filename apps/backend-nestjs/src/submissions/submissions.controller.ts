import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmissionStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('submissions')
  async findAll(
    @Query('studyId') studyId?: string,
    @Query('assignmentId') assignmentId?: string,
    @Query('enumeratorId') enumeratorId?: string,
    @Query('status') status?: SubmissionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.submissionsService.findAll({
      studyId,
      assignmentId,
      enumeratorId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('submissions')
  async create(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.create(dto, user.id, user.organizationId);
  }

  @Get('submissions/:id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.findById(id);
  }

  @Put('submissions/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    return this.submissionsService.update(id, dto);
  }

  @Delete('submissions/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.remove(id);
  }

  @Post('submissions/:id/complete')
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.complete(id);
  }

  @Post('submissions/:id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.approve(id, user.id);
  }

  @Post('submissions/:id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.reject(id, user.id);
  }

  @Post('submissions/:id/flag')
  async flag(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.flag(id);
  }

  @Get('submissions/:id/quality')
  async getQualityAssessment(@Param('id', ParseUUIDPipe) id: string) {
    return this.submissionsService.getQualityAssessment(id);
  }

  @Get('submissions/export')
  async exportSubmissions(
    @Query('studyId') studyId?: string,
    @Query('status') status?: SubmissionStatus,
  ) {
    return this.submissionsService.exportSubmissions({ studyId, status });
  }

  @Get('enumerators/:enumeratorId/submissions')
  async getEnumeratorSubmissions(@Param('enumeratorId', ParseUUIDPipe) enumeratorId: string) {
    return this.submissionsService.findByEnumerator(enumeratorId);
  }

  @Get('enumerators/:enumeratorId/stats')
  async getEnumeratorStats(@Param('enumeratorId', ParseUUIDPipe) enumeratorId: string) {
    return this.submissionsService.getEnumeratorStats(enumeratorId);
  }
}
