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
  RetryTranscriptDto,
  TranslateTranscriptDto,
} from './dto/transcript-actions.dto';
import {
  ApproveTranscriptDto,
  CompareRevisionsQuery,
  RenameSpeakerDto,
  ReviewNoteDto,
  ReviewSegmentDto,
} from './dto/transcript-review.dto';
import { TranscriptReviewService } from './transcript-review.service';
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
    private readonly review: TranscriptReviewService,
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
    @Query('type') type?: string,
    @Query('reviewStatus') reviewStatus?: string,
    @Query('projectId', new ParseUUIDPipe({ optional: true }))
    projectId?: string,
  ) {
    if (interviewId) {
      return this.transcriptsService.findForInterview(
        interviewId,
        user.organizationId,
      );
    }
    return this.transcriptsService.findAllForOrganization(user.organizationId, {
      type,
      reviewStatus,
      projectId,
    });
  }

  /** Where transcripts stand in review: the dashboard's counts. */
  @Get('review-summary')
  @Permissions('view.transcripts')
  async reviewSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId', new ParseUUIDPipe({ optional: true }))
    projectId?: string,
  ) {
    return this.transcriptsService.reviewSummary(
      user.organizationId,
      projectId,
    );
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

  /**
   * The full review view for an administrator: segments with machine and
   * reviewed text side by side, flags, confidence, events and revisions.
   */
  @Get(':id/review')
  @Permissions('view.transcripts')
  async reviewDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.adminDetail(id, user.organizationId);
  }

  /** Correct one segment (text, speaker, flag, note); the machine text is kept alongside. */
  @Patch(':id/segments/:segmentId')
  @Permissions('edit.transcripts')
  async editSegment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
    @Body() dto: ReviewSegmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.editAsAdmin(
      id,
      segmentId,
      dto,
      user.id,
      user.organizationId,
    );
  }

  @Post(':id/speakers/rename')
  @HttpCode(200)
  @Permissions('edit.transcripts')
  async renameSpeaker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameSpeakerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.renameSpeakerAsAdmin(
      id,
      dto.from,
      dto.to,
      user.id,
      user.organizationId,
    );
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Permissions('approve.transcripts')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveTranscriptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.approve(id, dto, user.id, user.organizationId);
  }

  @Post(':id/return')
  @HttpCode(200)
  @Permissions('approve.transcripts')
  async returnForCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.returnForCorrection(
      id,
      dto.note,
      user.id,
      user.organizationId,
    );
  }

  @Post(':id/reopen')
  @HttpCode(200)
  @Permissions('approve.transcripts')
  async reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.reopen(id, dto.note, user.id, user.organizationId);
  }

  @Post(':id/lock')
  @HttpCode(200)
  @Permissions('approve.transcripts')
  async lock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.lock(id, user.id, user.organizationId);
  }

  @Get(':id/revisions')
  @Permissions('view.transcripts')
  async revisions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.revisions(id, user.organizationId);
  }

  @Get(':id/revisions/compare')
  @Permissions('view.transcripts')
  async compare(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CompareRevisionsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.compare(id, user.organizationId, query.from, query.to);
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
