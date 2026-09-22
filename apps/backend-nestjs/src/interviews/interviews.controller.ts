import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { CompleteRecordingUploadDto } from './dto/complete-recording-upload.dto';

/**
 * Resumable-upload parts are small by design (the field app sends 512 KiB);
 * the cap leaves headroom for other clients without letting one "part"
 * become a whole-file upload in disguise.
 */
const MAX_PART_BYTES = 8 * 1024 * 1024;

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
    @Query('interviewerId') interviewerId?: string,
  ) {
    return this.interviewsService.findAll(
      user.organizationId,
      { participantId, projectId, status, interviewerId },
      user.id,
    );
  }

  @Post()
  @Permissions('create.interviews')
  async create(
    @Body() dto: CreateInterviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.create(dto, user.id, user.organizationId);
  }

  /**
   * Who an interview can be assigned to: active members of the caller's
   * organization, names only, with a field-interviewer flag. Lets research
   * staff assign work without `view.users` (which exposes emails, access
   * codes and roles). Declared before `:id` so it is not parsed as an id.
   */
  @Get('interviewers')
  @Permissions('create.interviews')
  async listInterviewers(@CurrentUser() user: AuthenticatedUser) {
    return this.interviewsService.listAssignableInterviewers(
      user.organizationId,
    );
  }

  @Get(':id')
  @Permissions('view.interviews')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.findById(id, user.organizationId, user.id);
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
      user.id,
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
    return this.interviewsService.listRecordings(
      id,
      user.organizationId,
      user.id,
    );
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
      user.id,
    );
  }

  /**
   * PHASE 2 — resumable recording upload, used by the field app's offline
   * outbox. The upload id is the device's own recording id (a UUID), so
   * every call below is idempotent and safe to retry after a dropped
   * connection. Consent is re-checked on every call.
   */
  @Get(':id/recordings/uploads/:uploadId')
  @Permissions('upload.recordings')
  async getRecordingUploadStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.getRecordingUploadStatus(
      id,
      uploadId,
      user.id,
      user.organizationId,
    );
  }

  @Put(':id/recordings/uploads/:uploadId/parts/:index')
  @Permissions('upload.recordings')
  @UseInterceptors(
    FileInterceptor('chunk', { limits: { fileSize: MAX_PART_BYTES } }),
  )
  async putRecordingPart(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Param('index', ParseIntPipe) index: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Missing "chunk" file field');
    }
    return this.interviewsService.putRecordingPart(
      id,
      uploadId,
      index,
      file.buffer,
      user.id,
      user.organizationId,
    );
  }

  @Post(':id/recordings/uploads/:uploadId/complete')
  @Permissions('upload.recordings')
  async completeRecordingUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Body() dto: CompleteRecordingUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interviewsService.completeRecordingUpload(
      id,
      uploadId,
      dto,
      user.id,
      user.organizationId,
    );
  }
}
