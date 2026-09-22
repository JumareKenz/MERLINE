import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { TranscriptsService } from './transcripts.service';
import { CreateTranscriptDto } from './dto/create-transcript.dto';

@Controller('transcripts')
export class TranscriptsController {
  constructor(private readonly transcriptsService: TranscriptsService) {}

  @Get()
  @Permissions('view.transcripts')
  async findForInterview(
    @Query('interviewId', ParseUUIDPipe) interviewId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transcriptsService.findForInterview(
      interviewId,
      user.organizationId,
    );
  }

  @Post()
  @Permissions('create.transcripts')
  async create(
    @Body() dto: CreateTranscriptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transcriptsService.requestTranscript(
      dto.interviewId,
      dto.mediaId,
      user.id,
      user.organizationId,
    );
  }

  @Get(':id')
  @Permissions('view.transcripts')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transcriptsService.findById(id, user.organizationId);
  }

  @Post(':id/retry')
  @Permissions('create.transcripts')
  async retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transcriptsService.retry(id, user.organizationId);
  }
}
