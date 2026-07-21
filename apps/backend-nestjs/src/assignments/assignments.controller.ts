import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { BatchAssignmentDto } from './dto/batch-assignment.dto';
import { AssignmentStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('assignments')
  async findAll(
    @Query('studyId') studyId?: string,
    @Query('enumeratorId') enumeratorId?: string,
    @Query('status') status?: AssignmentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assignmentsService.findAll({
      studyId,
      enumeratorId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('assignments')
  async create(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.create(dto, user.id, user.organizationId);
  }

  @Get('assignments/:id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentsService.findById(id);
  }

  @Put('assignments/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(id, dto);
  }

  @Delete('assignments/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentsService.remove(id);
  }

  @Post('assignments/batch')
  async batchCreate(
    @Body() dto: BatchAssignmentDto,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.batchCreate(dto, user.id, user.organizationId);
  }

  @Post('assignments/:id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.approve(id, user.id);
  }

  @Post('assignments/:id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.reject(id, user.id, notes);
  }

  @Get('assignments/:id/progress')
  async getProgress(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentsService.getProgress(id);
  }

  @Get('enumerators/:enumeratorId/assignments')
  async getEnumeratorAssignments(
    @Param('enumeratorId', ParseUUIDPipe) enumeratorId: string,
    @Query('status') status?: AssignmentStatus,
    @Query('studyId') studyId?: string,
  ) {
    return this.assignmentsService.getEnumeratorAssignments(enumeratorId, { status, studyId });
  }

  @Get('enumerators/:enumeratorId/load')
  async getEnumeratorLoad(@Param('enumeratorId', ParseUUIDPipe) enumeratorId: string) {
    return this.assignmentsService.getEnumeratorLoad(enumeratorId);
  }
}
