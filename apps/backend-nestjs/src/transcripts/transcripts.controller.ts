import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { TranscriptsService } from './transcripts.service';
import { CreateTranscriptDto } from './dto/create-transcript.dto';
import { AskTranscriptDto } from './dto/ask-transcript.dto';
import {
  EditSegmentDto,
  RetryTranscriptDto,
  TranslateTranscriptDto,
} from './dto/transcript-actions.dto';
import { TranscriptDialogueService } from './transcript-dialogue.service';

/**
 * Transcripts are administrator-only: no other system role holds
 * `view.transcripts`, `create.transcripts` or `edit.transcripts`.
 * Transcription itself runs in the job worker; create and retry return a
 * PENDING transcript immediately (202).
 */
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
  @HttpCode(202)
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
      dto.language,
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
  @HttpCode(202)
  @Permissions('create.transcripts')
  async retry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetryTranscriptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transcriptsService.retry(id, user.organizationId, dto.language);
  }

  /** Correct one segment; the machine text is kept alongside. */
  @Patch(':id/segments/:segmentId')
  @Permissions('edit.transcripts')
  async editSegment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
    @Body() dto: EditSegmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transcriptsService.editSegment(
      id,
      segmentId,
      dto.text,
      user.id,
      user.organizationId,
    );
  }

  /** Queue a machine translation (needs consent to AI analysis). */
  @Post(':id/translate')
  @HttpCode(202)
  @Permissions('edit.transcripts', 'use.ai')
  async translate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TranslateTranscriptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transcriptsService.translate(
      id,
      user.organizationId,
      dto.language,
    );
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
