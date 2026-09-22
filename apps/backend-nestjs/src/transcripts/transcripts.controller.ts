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
import { AskTranscriptDto } from './dto/ask-transcript.dto';
import { TranscriptDialogueService } from './transcript-dialogue.service';

@Controller('transcripts')
export class TranscriptsController {
  constructor(
    private readonly transcriptsService: TranscriptsService,
    private readonly dialogueService: TranscriptDialogueService,
  ) {}

  /**
   * With `interviewId`, that interview's transcripts. Without it, every
   * transcript in the organization (newest first, with interview and
   * participant context) for the Transcripts workspace.
   */
  @Get()
  @Permissions('view.transcripts')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('interviewId', new ParseUUIDPipe({ optional: true }))
    interviewId?: string,
  ) {
    if (interviewId) {
      return this.transcriptsService.findForInterview(
        interviewId,
        user.organizationId,
      );
    }
    return this.transcriptsService.findAllForOrganization(user.organizationId);
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

  /** AI Dialogue: a grounded, cited answer from one transcript. Nothing is stored. */
  @Post(':id/ask')
  @Permissions('view.transcripts', 'use.ai')
  async ask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AskTranscriptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dialogueService.ask(id, dto.question, user.organizationId);
  }
}
