import {
  Body,
  Controller,
  Delete,
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
import { MediaType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { InitChunkedUploadDto } from './dto/init-chunked-upload.dto';
import { MediaService } from './media.service';

/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Every route is tenant-scoped through `user.organizationId`.
 *
 * Removed in this pass:
 *  - `GET /submissions/:submissionId/media`. Submissions are a deregistered
 *    legacy module, so an active controller was serving a legacy resource.
 *    The qualitative equivalent arrives in Phase 2 as recordings hanging off
 *    an interview.
 *  - The `submissionId` body parameter on upload, for the same reason.
 *
 * Changed:
 *  - `GET /media/:id/download` returns a short-lived signed URL instead of
 *    proxying bytes. It previously streamed any file to any authenticated
 *    caller who knew its UUID, with no ownership check.
 *
 * `@UseGuards(JwtAuthGuard)` is gone because authentication, tenancy and
 * authorization are now bound globally in `app.module.ts`.
 */
@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('media/upload')
  @Permissions('upload.media')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Body('type') type?: string,
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

    return this.mediaService.upload(
      file,
      { type: type as MediaType | undefined, metadata: parsedMetadata },
      user.id,
      user.organizationId,
    );
  }

  @Post('media/chunked/init')
  async initChunkedUpload(@Body() dto: InitChunkedUploadDto) {
    return this.mediaService.initChunkedUpload(dto);
  }

  @Put('media/chunked/:identifier')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @Param('identifier', ParseUUIDPipe) identifier: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('index') index: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.uploadChunk(
      identifier,
      file,
      Number.parseInt(index, 10),
      user.id,
      user.organizationId,
    );
  }

  @Post('media/chunked/:identifier/complete')
  async completeChunkedUpload(
    @Param('identifier', ParseUUIDPipe) identifier: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('originalName') originalName?: string,
    @Body('mimeType') mimeType?: string,
  ) {
    return this.mediaService.completeChunkedUpload(
      identifier,
      user.id,
      user.organizationId,
      { originalName, mimeType },
    );
  }

  @Get('media')
  @Permissions('view.media')
  async list(@CurrentUser() user: AuthenticatedUser, @Query('type') type?: MediaType) {
    return this.mediaService.listForOrganization(user.organizationId, type);
  }

  @Get('media/:id')
  @Permissions('view.media')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.findById(id, user.organizationId);
  }

  @Get('media/:id/download')
  @Permissions('view.media')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { url, expiresIn } = await this.mediaService.getDownloadUrl(
      id,
      user.organizationId,
    );
    return { url, expiresIn };
  }

  @Get('media/:id/status')
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.getStatus(id, user.organizationId);
  }

  @Delete('media/:id')
  @Permissions('delete.media')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.remove(id, user.organizationId);
  }
}
