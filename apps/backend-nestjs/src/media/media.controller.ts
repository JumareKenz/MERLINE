import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe,
  Res, Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { InitChunkedUploadDto } from './dto/init-chunked-upload.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('media/upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string | undefined,
    @Body('submissionId') submissionId: string | undefined,
    @Body('metadata') metadata: string | undefined,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      return { status: 'error', message: 'No file provided' };
    }

    const parsedMetadata = metadata ? JSON.parse(metadata) : undefined;
    return this.mediaService.upload(
      file,
      {
        type: type as any,
        submissionId,
        metadata: parsedMetadata,
      },
      user.id,
      user.organizationId,
    );
  }

  @Post('media/chunked/init')
  async initChunkedUpload(
    @Body() dto: InitChunkedUploadDto,
    @CurrentUser() user: any,
  ) {
    return this.mediaService.initChunkedUpload(dto, user.id);
  }

  @Put('media/chunked/:identifier')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @Param('identifier') identifier: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('index') index: string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      return { status: 'error', message: 'No chunk provided' };
    }
    return this.mediaService.uploadChunk(identifier, file, parseInt(index, 10), user.id);
  }

  @Post('media/chunked/:identifier/complete')
  async completeChunkedUpload(
    @Param('identifier') identifier: string,
    @Body('submissionId') submissionId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.mediaService.completeChunkedUpload(identifier, user.id, user.organizationId, submissionId);
  }

  @Get('media/:id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findById(id);
  }

  @Get('media/:id/download')
  @Header('Content-Type', 'application/octet-stream')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, media } = await this.mediaService.download(id);
    res.setHeader('Content-Disposition', `attachment; filename="${media.originalName}"`);
    res.setHeader('Content-Length', media.size);
    stream.pipe(res);
  }

  @Delete('media/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.remove(id);
  }

  @Get('media/:id/status')
  async getStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.getStatus(id);
  }

  @Get('submissions/:submissionId/media')
  async getSubmissionMedia(@Param('submissionId', ParseUUIDPipe) submissionId: string) {
    return this.mediaService.getSubmissionMedia(submissionId);
  }
}
