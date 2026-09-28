import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import {
  CompleteRespondentUploadDto,
  RespondentAnswersDto,
  StartRespondentSessionDto,
} from './dto/respond.dto';
import { RespondService } from './respond.service';

/** Same cap as the field app's resumable parts. */
const MAX_PART_BYTES = 8 * 1024 * 1024;

/** The header carrying the session secret the respondent's device made. */
const SECRET_HEADER = 'x-respondent-key';

/**
 * PUBLIC — respondents answering through a self-interview link have no
 * account. The token in the path proves the invitation; after starting,
 * the session secret (header) proves each call is the same respondent.
 * Rate limits are per IP; part uploads get more room because a long answer
 * is dozens of parts, and respondents on one mobile network can share an IP.
 */
@Public()
@Controller('respond/:token')
export class RespondController {
  constructor(private readonly respond: RespondService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  getLink(@Param('token') token: string) {
    return this.respond.getLink(token);
  }

  @Post('sessions')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  start(
    @Param('token') token: string,
    @Body() dto: StartRespondentSessionDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.respond.start(token, dto, userAgent);
  }

  @Get('sessions/:sessionId')
  state(
    @Param('token') token: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Headers(SECRET_HEADER) secret?: string,
  ) {
    return this.respond.state(token, sessionId, secret ?? '');
  }

  @Get('sessions/:sessionId/uploads/:uploadId')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  uploadStatus(
    @Param('token') token: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Headers(SECRET_HEADER) secret?: string,
  ) {
    return this.respond.uploadStatus(token, sessionId, secret ?? '', uploadId);
  }

  @Put('sessions/:sessionId/uploads/:uploadId/parts/:index')
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('chunk', { limits: { fileSize: MAX_PART_BYTES } }),
  )
  putPart(
    @Param('token') token: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Param('index', ParseIntPipe) index: number,
    @UploadedFile() file: Express.Multer.File,
    @Headers(SECRET_HEADER) secret?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('Missing "chunk" file field');
    return this.respond.putPart(
      token,
      sessionId,
      secret ?? '',
      uploadId,
      index,
      file.buffer,
    );
  }

  @Post('sessions/:sessionId/uploads/:uploadId/complete')
  completeUpload(
    @Param('token') token: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Body() dto: CompleteRespondentUploadDto,
    @Headers(SECRET_HEADER) secret?: string,
  ) {
    return this.respond.completeUpload(
      token,
      sessionId,
      secret ?? '',
      uploadId,
      dto,
    );
  }

  @Put('sessions/:sessionId/answers')
  saveAnswers(
    @Param('token') token: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: RespondentAnswersDto,
    @Headers(SECRET_HEADER) secret?: string,
  ) {
    return this.respond.saveAnswers(token, sessionId, secret ?? '', dto.entries);
  }

  @Post('sessions/:sessionId/finish')
  finish(
    @Param('token') token: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Headers(SECRET_HEADER) secret?: string,
  ) {
    return this.respond.finish(token, sessionId, secret ?? '');
  }
}
