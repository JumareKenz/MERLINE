import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewStatusDto } from './dto/update-interview-status.dto';

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  @Permissions('view.interviews')
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('participantId') participantId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: InterviewStatus,
  ) {
    return this.interviewsService.findAll(user.organizationId, {
      participantId,
      projectId,
      status,
    });
  }

  @Post()
  @Permissions('create.interviews')
  async create(
    @Body() dto: CreateInterviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.create(dto, user.id, user.organizationId);
  }

  @Get(':id')
  @Permissions('view.interviews')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.findById(id, user.organizationId);
  }

  @Put(':id/status')
  @Permissions('edit.interviews')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.updateStatus(
      id,
      dto.status,
      user.organizationId,
    );
  }

  @Post(':id/recordings')
  @Permissions('upload.recordings')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRecording(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Body('metadata') metadata?: string,
  ) {
    let parsedMetadata: Record<string, unknown> | undefined;
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata) as Record<string, unknown>;
      } catch {
        parsedMetadata = undefined;
      }
    }

    return this.interviewsService.uploadRecording(
      id,
      file,
      parsedMetadata,
      user.id,
      user.organizationId,
    );
  }

  @Get(':id/recordings')
  @Permissions('view.recordings')
  async listRecordings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.listRecordings(id, user.organizationId);
  }

  @Get(':id/recordings/:mediaId/download')
  @Permissions('view.recordings')
  async getRecordingDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.getRecordingDownloadUrl(
      id,
      mediaId,
      user.organizationId,
    );
  }
}
