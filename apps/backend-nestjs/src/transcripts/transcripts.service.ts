import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transcript, TranscriptReviewStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { ConsentsService } from '../consents/consents.service';
import { queueTranscription, queueTranslation } from './transcription-queue';

@Injectable()
export class TranscriptsService extends BaseService {
  constructor(
    prisma: PrismaService,
    private readonly consentsService: ConsentsService,
  ) {
    super(prisma);
  }

  async findById(id: string, organizationId: string) {
    const transcript = await this.prisma.transcript.findFirst({
      where: { id, organizationId },
      include: {
        segments: {
          orderBy: { index: 'asc' },
          include: {
            editedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        media: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            metadata: true,
          },
        },
        interview: {
          select: {
            id: true,
            projectId: true,
            language: true,
            participant: { select: { id: true, displayName: true } },
            consent: {
              select: {
                allowAiAnalysis: true,
                allowQuotation: true,
                withdrawnAt: true,
              },
            },
          },
        },
      },
    });

    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }

    return transcript;
  }

  async findAllForOrganization(
    organizationId: string,
    filter: { type?: string; reviewStatus?: string; projectId?: string } = {},
  ) {
    const reviewStatus = Object.values(TranscriptReviewStatus).find(
      (s) => s === filter.reviewStatus,
    );
    if (filter.reviewStatus && !reviewStatus) {
      throw new BadRequestException('Unknown review status');
    }
    return this.prisma.transcript.findMany({
      where: {
        organizationId,
        ...(reviewStatus && { reviewStatus }),
        interview: {
          deletedAt: null,
          ...(filter.type && { type: filter.type }),
          ...(filter.projectId && { projectId: filter.projectId }),
        },
        media: { deletedAt: null },
      },
      omit: { text: true },
      include: {
        interview: {
          select: {
            id: true,
            projectId: true,
            type: true,
            enumeratorName: true,
            participant: { select: { id: true, displayName: true } },
          },
        },
        _count: { select: { segments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  /** Counts for the dashboard: where every transcript is in the review lifecycle. */
  async reviewSummary(organizationId: string, projectId?: string) {
    const where = {
      organizationId,
      interview: { deletedAt: null, ...(projectId && { projectId }) },
      media: { deletedAt: null },
    };
    const [byStatus, byType] = await Promise.all([
      this.prisma.transcript.groupBy({
        by: ['reviewStatus'],
        where,
        _count: { _all: true },
      }),
      this.prisma.transcript.findMany({
        where,
        select: { reviewStatus: true, interview: { select: { type: true } } },
      }),
    ]);
    const status = Object.fromEntries(
      Object.values(TranscriptReviewStatus).map((s) => [s, 0]),
    ) as Record<TranscriptReviewStatus, number>;
    for (const row of byStatus) status[row.reviewStatus] = row._count._all;

    const types = new Map<string, { total: number; approved: number }>();
    for (const t of byType) {
      const key = t.interview.type ?? 'OTHER';
      const entry = types.get(key) ?? { total: 0, approved: 0 };
      entry.total++;
      if (t.reviewStatus === 'APPROVED' || t.reviewStatus === 'LOCKED')
        entry.approved++;
      types.set(key, entry);
    }
    return {
      byStatus: status,
      byType: [...types.entries()].map(([type, v]) => ({ type, ...v })),
    };
  }

  async findForInterview(interviewId: string, organizationId: string) {
    return this.prisma.transcript.findMany({
      where: { interviewId, organizationId, media: { deletedAt: null } },
      omit: { text: true },
      include: { _count: { select: { segments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Queues a transcript for a recording (for example one uploaded before
   * automatic transcription, or again with a different language hint).
   * Returns at once with a PENDING transcript; the job worker does the work.
   */
  async requestTranscript(
    interviewId: string,
    mediaId: string,
    userId: string,
    organizationId: string,
    language?: string,
  ): Promise<Transcript> {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, organizationId, deletedAt: null },
    });
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, organizationId, interviewId, deletedAt: null },
    });
    if (!media) {
      throw new NotFoundException('Recording not found on this interview');
    }

    const consent = await this.consentsService.findById(
      interview.consentId,
      organizationId,
    );
    this.consentsService.assertScope(consent, 'allowTranscription');

    return this.executeTransaction(async (tx) => {
      const active = await tx.transcript.findFirst({
        where: { mediaId, status: { in: ['PENDING', 'PROCESSING'] } },
      });
      if (active) {
        throw new ConflictException(
          'This recording is already being transcribed',
        );
      }

      const transcript = await tx.transcript.create({
        data: {
          status: 'PENDING',
          organizationId,
          interviewId,
          mediaId,
          requestedById: userId,
          requestedLanguage: language ?? interview.language,
        },
      });
      await queueTranscription(tx, transcript);
      return transcript;
    });
  }

  /**
   * Queues a FAILED transcript again, optionally with a different language
   * hint. Consent is re-checked here and again when the job runs.
   */
  async retry(
    id: string,
    organizationId: string,
    language?: string,
  ): Promise<Transcript> {
    const transcript = await this.prisma.transcript.findFirst({
      where: { id, organizationId },
      include: { interview: true },
    });
    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }
    if (transcript.status !== 'FAILED') {
      throw new BadRequestException(
        `Cannot retry a transcript in status ${transcript.status}`,
      );
    }

    const consent = await this.consentsService.findById(
      transcript.interview.consentId,
      organizationId,
    );
    this.consentsService.assertScope(consent, 'allowTranscription');

    return this.executeTransaction(async (tx) => {
      const updated = await tx.transcript.update({
        where: { id: transcript.id },
        data: {
          status: 'PENDING',
          errorMessage: null,
          nextAttemptAt: null,
          attempts: 0,
          ...(language && { requestedLanguage: language }),
        },
      });
      await queueTranscription(tx, updated);
      return updated;
    });
  }

  /**
   * Queues a machine translation of the transcript (stored per segment,
   * alongside the original). Translation is AI processing of the
   * participant's words, so it needs consent to AI analysis.
   */
  async translate(id: string, organizationId: string, language = 'en') {
    const transcript = await this.prisma.transcript.findFirst({
      where: { id, organizationId },
      include: {
        interview: true,
        _count: { select: { segments: true } },
      },
    });
    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }
    if (transcript.status !== 'COMPLETED' || transcript._count.segments === 0) {
      throw new BadRequestException(
        'Only a completed transcript with speech can be translated',
      );
    }

    const consent = await this.consentsService.findById(
      transcript.interview.consentId,
      organizationId,
    );
    this.consentsService.assertScope(consent, 'allowAiAnalysis');

    if (
      transcript.translationStatus === 'PENDING' ||
      transcript.translationStatus === 'PROCESSING'
    ) {
      throw new ConflictException('A translation is already in progress');
    }

    return this.executeTransaction(async (tx) => {
      await queueTranslation(tx, transcript, language);
      return tx.transcript.update({
        where: { id: transcript.id },
        data: {
          translationStatus: 'PENDING',
          translationLanguage: language,
          translationError: null,
        },
        omit: { text: true },
      });
    });
  }
}
