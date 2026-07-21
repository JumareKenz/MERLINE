import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudiesService } from './studies.service';
import { CreateStudyDto } from './dto/create-study.dto';
import { UpdateStudyDto } from './dto/update-study.dto';
import { TransitionStudyDto } from './dto/transition-study.dto';
import { StudyStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('studies')
export class StudiesController {
  constructor(private readonly studiesService: StudiesService) {}

  @Get()
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: StudyStatus,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.studiesService.findAll({
      projectId,
      status,
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Post()
  async create(
    @Body() dto: CreateStudyDto,
    @CurrentUser() user: any,
  ) {
    return this.studiesService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.studiesService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudyDto,
  ) {
    return this.studiesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.studiesService.remove(id);
  }

  @Post(':id/transition')
  async transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionStudyDto,
    @CurrentUser() user: any,
  ) {
    return this.studiesService.transition(id, dto.status, user.id);
  }

  @Get(':id/transitions')
  async getAllowedTransitions(@Param('id', ParseUUIDPipe) id: string) {
    return this.studiesService.getAllowedTransitions(id);
  }

  @Post(':id/execute-transition')
  async executeTransition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionStudyDto,
    @CurrentUser() user: any,
  ) {
    return this.studiesService.executeTransition(id, dto.status, dto.notes, user.id);
  }

  @Post(':id/clone')
  async clone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.studiesService.clone(id, user.id, user.organizationId);
  }

  @Get(':id/lifecycle')
  async getLifecycle(@Param('id', ParseUUIDPipe) id: string) {
    return this.studiesService.getLifecycle(id);
  }

  @Post(':id/lock')
  async lock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.studiesService.lock(id, user.id);
  }

  @Post(':id/unlock')
  async unlock(@Param('id', ParseUUIDPipe) id: string) {
    return this.studiesService.unlock(id);
  }

  @Post(':id/archive')
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.studiesService.transition(id, 'ARCHIVED' as any, user.id);
  }

  @Post(':id/restore')
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.studiesService.update(id, { isLocked: false } as any);
  }
}
