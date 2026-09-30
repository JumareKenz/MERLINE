import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces';
import { TranscriptReviewService } from './transcript-review.service';
import {
  RenameSpeakerDto,
  ReviewSegmentDto,
  SubmitReviewDto,
} from './dto/transcript-review.dto';

/**
 * The enumerator's side of transcript review. Every call is scoped to
 * interviews this user conducted (the service answers 404 for anything
 * else), so `review.transcripts` never grants organization-wide access.
 */
@Controller('field/transcripts')
export class FieldTranscriptsController {
  constructor(private readonly review: TranscriptReviewService) {}

  @Get()
  @Permissions('review.transcripts')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.review.listMine(user.id, user.organizationId);
  }

  @Get(':id')
  @Permissions('review.transcripts')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.getMine(id, user.id, user.organizationId);
  }

  @Get(':id/audio')
  @Permissions('review.transcripts')
  audio(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.audioForMine(id, user.id, user.organizationId);
  }

  @Patch(':id/segments/:segmentId')
  @Permissions('review.transcripts')
  edit(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
    @Body() dto: ReviewSegmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.editMine(
      id,
      segmentId,
      dto,
      user.id,
      user.organizationId,
    );
  }

  @Post(':id/speakers/rename')
  @HttpCode(200)
  @Permissions('review.transcripts')
  renameSpeaker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameSpeakerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.renameSpeakerMine(
      id,
      dto.from,
      dto.to,
      user.id,
      user.organizationId,
    );
  }

  @Post(':id/submit')
  @HttpCode(200)
  @Permissions('review.transcripts')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.review.submitMine(id, dto.note, user.id, user.organizationId);
  }
}
