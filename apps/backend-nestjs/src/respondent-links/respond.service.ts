import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { consentBlockReason } from '../consents/consents.service';
import { MediaService } from '../media/media.service';
import { queueTranscriptionForRecording } from '../transcripts/transcription-queue';
import { jsonObject } from '../common/utils/prisma-json';
import { TRANSCRIPTION_LANGUAGES } from '../transcripts/languages';
import type {
  CompleteRespondentUploadDto,
  RespondentAnswerEntryDto,
  StartRespondentSessionDto,
} from './dto/respond.dto';
import { linkState } from './link-state';

/** Recordings one session may start (a restart after a problem, not more). */
const MAX_UPLOADS_PER_SESSION = 5;

const PUBLIC_LINK_INCLUDE = {
  organization: { select: { name: true } },
  project: { select: { name: true, deletedAt: true } },
  questionSet: {
    include: { questions: { orderBy: { order: 'asc' } } },
  },
} as const;

type SessionRow = Prisma.RespondentSessionGetPayload<{
  include: {
    link: true;
    interview: { include: { consent: true } };
  };
}>;

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * The respondent's side of a self-interview link: no account, no JWT.
 * The link token proves they were invited; after they start, a session
 * secret their own device made (only its hash is stored) proves every
 * later call is theirs.
 *
 * What a respondent creates is an ordinary participant, consent record and
 * interview, attributed to the link's creator, so the consent gate,
 * transcription, reports and the Trash all apply unchanged. Recording is
 * refused unless consent allows it, checked on every upload call exactly
 * as for field recordings.
 */
@Injectable()
export class RespondService {
  private readonly logger = new Logger(RespondService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /** What the respondent sees before starting. Never exposes ids beyond the guide's. */
  async getLink(token: string) {
    const link = await this.findLink(token);
    const completed = await this.completedCount(link.id);
    const set = link.questionSet;
    return {
      title: link.title,
      intro: link.intro,
      consentText: link.consentText,
      organizationName: link.organization.name,
      projectName: link.project.name,
      interviewType: link.interviewType,
      language: link.language,
      languages: set.languages.filter((l) => l in TRANSCRIPTION_LANGUAGES),
      respondentName: link.respondentName,
      state: linkState(link, completed),
      guide: {
        id: set.id,
        title: set.title,
        languages: set.languages,
        questions: set.questions.map((q) => ({
          id: q.id,
          order: q.order,
          section: q.section,
          text: q.text,
          // Every question is answered out loud, in the respondent's own
          // words. A guide written before that rule may still hold answer
          // options in the database (kept as history); a respondent never
          // sees them.
          type: 'OPEN' as const,
          required: q.required,
        })),
      },
    };
  }

  async start(
    token: string,
    dto: StartRespondentSessionDto,
    userAgent: string | undefined,
  ) {
    const link = await this.findLink(token);
    const secretHash = hashSecret(dto.secret);

    // A retry of the same start (dropped response, double tap).
    const existing = await this.prisma.respondentSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (existing) {
      if (
        existing.linkId !== link.id ||
        !sameHash(existing.secretHash, secretHash)
      )
        throw new ConflictException('This session id is already in use');
      return this.state(token, dto.sessionId, dto.secret);
    }

    const state = linkState(link, await this.completedCount(link.id));
    if (state !== 'open') throw new GoneException(this.closedMessage(state));
    if (!dto.consent.allowRecording)
      throw new BadRequestException(
        'This interview is answered by recording your voice, so it needs your permission to record.',
      );

    const now = new Date();
    const language = dto.language ?? link.language;
    try {
      await this.prisma.$transaction(async (tx) => {
        const participant = await tx.participant.create({
          data: {
            displayName: dto.respondent.name.trim(),
            projectId: link.projectId,
            organizationId: link.organizationId,
            createdById: link.createdById,
            metadata: jsonObject({
              selfEnrolled: true,
              respondentLinkId: link.id,
              ...(dto.respondent.role?.trim() && {
                role: dto.respondent.role.trim(),
              }),
              ...(dto.respondent.organisation?.trim() && {
                organisation: dto.respondent.organisation.trim(),
              }),
            }),
          },
        });
        const consent = await tx.consent.create({
          data: {
            participantId: participant.id,
            version: 'self-interview-link',
            method: 'DIGITAL',
            allowRecording: dto.consent.allowRecording,
            allowTranscription: dto.consent.allowTranscription,
            allowAiAnalysis: dto.consent.allowAiAnalysis,
            allowQuotation: dto.consent.allowQuotation,
            allowPublication: dto.consent.allowPublication,
            grantedAt: now,
            // The exact words the respondent agreed to, and where.
            metadata: jsonObject({
              selfAdministered: true,
              respondentLinkId: link.id,
              sessionId: dto.sessionId,
              consentText: link.consentText,
              ...(userAgent && { userAgent: userAgent.slice(0, 300) }),
            }),
            organizationId: link.organizationId,
            actorId: link.createdById,
          },
        });
        const interview = await tx.interview.create({
          data: {
            participantId: participant.id,
            consentId: consent.id,
            projectId: link.projectId,
            interviewerId: link.createdById,
            status: 'IN_PROGRESS',
            startedAt: now,
            language,
            type: link.interviewType,
            questionSetId: link.questionSetId,
            respondentLinkId: link.id,
            notes: 'Self-administered through a shared link.',
            organizationId: link.organizationId,
          },
        });
        await tx.respondentSession.create({
          data: {
            id: dto.sessionId,
            secretHash,
            linkId: link.id,
            interviewId: interview.id,
            userAgent: userAgent?.slice(0, 300),
            organizationId: link.organizationId,
          },
        });
      });
    } catch (err) {
      // A concurrent retry of this same start won the race.
      if ((err as { code?: string })?.code === 'P2002') {
        return this.state(token, dto.sessionId, dto.secret);
      }
      throw err;
    }
    return this.state(token, dto.sessionId, dto.secret);
  }

  /** Where a session stands, so a reloaded page can pick up where it was. */
  async state(token: string, sessionId: string, secret: string) {
    const session = await this.authorize(token, sessionId, secret);
    const [recordings, answers] = await Promise.all([
      this.prisma.media.findMany({
        where: { interviewId: session.interviewId, deletedAt: null },
        select: { id: true, metadata: true, size: true, createdAt: true },
      }),
      this.prisma.interviewQuestionLog.findMany({
        where: { interviewId: session.interviewId },
        select: { questionId: true, status: true, answer: true, atMs: true },
      }),
    ]);
    return {
      sessionId: session.id,
      finished: !!session.finishedAt,
      language: session.interview.language,
      completedUploads: recordings
        .map((m) => (m.metadata as { uploadId?: string } | null)?.uploadId)
        .filter((u): u is string => !!u),
      answers,
    };
  }

  async uploadStatus(
    token: string,
    sessionId: string,
    secret: string,
    uploadId: string,
  ) {
    const session = await this.authorize(token, sessionId, secret);
    const completed = await this.mediaService.findCompletedRecording(
      uploadId,
      session.interviewId,
      session.organizationId,
    );
    if (completed)
      return { uploadId, receivedParts: [], completed: { id: completed.id } };
    this.assertRecordingAllowed(session);
    await this.bindUpload(session, uploadId);
    const parts = await this.mediaService.listRecordingParts(
      uploadId,
      this.uploaderKey(session),
    );
    return {
      uploadId,
      receivedParts: parts.map((p) => p.index),
      completed: null,
    };
  }

  async putPart(
    token: string,
    sessionId: string,
    secret: string,
    uploadId: string,
    index: number,
    body: Buffer,
  ) {
    const session = await this.authorize(token, sessionId, secret);
    this.assertWritable(session);
    this.assertRecordingAllowed(session);
    await this.bindUpload(session, uploadId);
    return this.mediaService.putRecordingPart(
      uploadId,
      index,
      body,
      this.uploaderKey(session),
      session.organizationId,
    );
  }

  async completeUpload(
    token: string,
    sessionId: string,
    secret: string,
    uploadId: string,
    dto: CompleteRespondentUploadDto,
  ) {
    const session = await this.authorize(token, sessionId, secret);
    const done = await this.mediaService.findCompletedRecording(
      uploadId,
      session.interviewId,
      session.organizationId,
    );
    if (done) return { id: done.id, size: done.size };

    this.assertWritable(session);
    this.assertRecordingAllowed(session);
    await this.bindUpload(session, uploadId);
    const ext = dto.mimeType.includes('mp4')
      ? 'm4a'
      : dto.mimeType.includes('ogg')
        ? 'ogg'
        : dto.mimeType.includes('mpeg')
          ? 'mp3'
          : 'webm';
    const media = await this.mediaService.completeRecordingUpload(
      uploadId,
      this.uploaderKey(session),
      session.organizationId,
      {
        interviewId: session.interviewId,
        totalParts: dto.totalParts,
        mimeType: dto.mimeType,
        originalName: `self-interview-${session.interviewId.slice(0, 8)}.${ext}`,
        uploadedById: session.link.createdById,
        metadata: {
          source: 'self-interview-link',
          sessionId: session.id,
          ...(dto.durationMs !== undefined && { durationMs: dto.durationMs }),
          recordedAt: new Date().toISOString(),
        },
      },
    );
    try {
      await queueTranscriptionForRecording(this.prisma, {
        mediaId: media.id,
        interviewId: session.interviewId,
        organizationId: session.organizationId,
        requestedById: session.link.createdById,
      });
    } catch (err) {
      // The audio is stored; an administrator can start transcription.
      this.logger.error(
        `Could not queue transcription for ${media.id}: ${err instanceof Error ? err.message : err}`,
      );
    }
    return { id: media.id, size: media.size };
  }

  /**
   * Which questions were shown (and when in the recording) or skipped, and
   * answers to closed questions. Idempotent: the latest mark per question
   * wins, so resending after a dropped response is harmless.
   */
  async saveAnswers(
    token: string,
    sessionId: string,
    secret: string,
    entries: RespondentAnswerEntryDto[],
  ) {
    const session = await this.authorize(token, sessionId, secret);
    this.assertWritable(session);
    const questions = await this.prisma.guideQuestion.findMany({
      where: { questionSetId: session.interview.questionSetId ?? undefined },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));

    const latest = new Map<string, RespondentAnswerEntryDto>();
    for (const e of entries) {
      if (!byId.has(e.questionId))
        throw new BadRequestException(
          'A question is not part of this interview',
        );
      const prev = latest.get(e.questionId);
      if (!prev || Date.parse(e.markedAt) >= Date.parse(prev.markedAt))
        latest.set(e.questionId, e);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const e of latest.values()) {
        const markedAt = new Date(e.markedAt);
        const existing = await tx.interviewQuestionLog.findUnique({
          where: {
            interviewId_questionId: {
              interviewId: session.interviewId,
              questionId: e.questionId,
            },
          },
        });
        if (existing && existing.markedAt > markedAt) continue;
        const data = {
          status: e.status,
          atMs: e.atMs ?? null,
          recordingRef: e.recordingRef ?? null,
          // Answers are spoken and recorded. Nothing is picked from a
          // list, so there is no separate answer to store (the column
          // keeps what earlier, choice-based guides recorded).
          markedAt,
          recordedById: session.link.createdById,
        };
        if (existing) {
          await tx.interviewQuestionLog.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await tx.interviewQuestionLog.create({
            data: {
              ...data,
              interviewId: session.interviewId,
              questionId: e.questionId,
              organizationId: session.organizationId,
            },
          });
        }
      }
    });
    return { saved: latest.size };
  }

  /** The respondent is done. Needs a stored recording. */
  async finish(token: string, sessionId: string, secret: string) {
    const session = await this.authorize(token, sessionId, secret);
    if (session.finishedAt) return { finished: true };
    const recordings = await this.prisma.media.count({
      where: { interviewId: session.interviewId, deletedAt: null },
    });
    if (recordings === 0)
      throw new BadRequestException(
        'Your recording has not finished uploading yet',
      );
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.respondentSession.update({
        where: { id: session.id },
        data: { finishedAt: now },
      }),
      this.prisma.interview.updateMany({
        where: { id: session.interviewId, status: 'IN_PROGRESS' },
        data: { status: 'COMPLETED', endedAt: now },
      }),
    ]);
    return { finished: true };
  }

  /* ---------------------------------------------------------- */

  private async findLink(token: string) {
    const link = await this.prisma.respondentLink.findUnique({
      where: { token },
      include: PUBLIC_LINK_INCLUDE,
    });
    if (
      !link ||
      link.deletedAt ||
      link.project.deletedAt ||
      link.questionSet.deletedAt
    )
      throw new NotFoundException(
        'This link is not valid. Check that you copied all of it, or ask the research team for a new one.',
      );
    return link;
  }

  private completedCount(linkId: string) {
    return this.prisma.respondentSession.count({
      where: {
        linkId,
        finishedAt: { not: null },
        interview: { deletedAt: null },
      },
    });
  }

  private closedMessage(state: string) {
    return state === 'expired'
      ? 'This link has expired. Ask the research team for a new one.'
      : state === 'full'
        ? 'This link has already been used. Ask the research team for a new one.'
        : 'This link is closed and no longer accepts answers.';
  }

  private async authorize(
    token: string,
    sessionId: string,
    secret: string | undefined,
  ): Promise<SessionRow> {
    if (!secret) throw new UnauthorizedException('Missing session key');
    const session = await this.prisma.respondentSession.findUnique({
      where: { id: sessionId },
      include: { link: true, interview: { include: { consent: true } } },
    });
    // Same answer for "no such session" and "wrong secret or link".
    if (
      !session ||
      session.link.token !== token ||
      session.link.deletedAt ||
      !sameHash(session.secretHash, hashSecret(secret))
    )
      throw new UnauthorizedException('This session is not valid');
    if (session.interview.deletedAt)
      throw new GoneException(
        'This interview was removed by the research team.',
      );
    return session;
  }

  private assertWritable(session: SessionRow) {
    if (session.finishedAt)
      throw new ConflictException('This interview was already submitted.');
  }

  private assertRecordingAllowed(session: SessionRow) {
    const reason = consentBlockReason(
      session.interview.consent,
      'allowRecording',
    );
    if (reason) throw new ForbiddenException(reason);
  }

  /** Parts are stored per session, so no one else's upload can be touched. */
  private uploaderKey(session: SessionRow) {
    return `respondent-${session.id}`;
  }

  private async bindUpload(session: SessionRow, uploadId: string) {
    if (session.uploadIds.includes(uploadId)) return;
    if (session.uploadIds.length >= MAX_UPLOADS_PER_SESSION)
      throw new BadRequestException(
        'Too many recordings were started for this interview.',
      );
    await this.prisma.respondentSession.update({
      where: { id: session.id },
      data: { uploadIds: { push: uploadId } },
    });
    session.uploadIds.push(uploadId);
  }
}
