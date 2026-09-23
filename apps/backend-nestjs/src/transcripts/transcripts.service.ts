import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transcript } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { ConsentsService } from '../consents/consents.service';
import { queueTranscription, queueTranslation } from './transcription-queue';
import { segmentText } from './segment-text';

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

  async findAllForOrganization(organizationId: string) {
    return this.prisma.transcript.findMany({
      where: { organizationId, interview: { deletedAt: null } },
      omit: { text: true },
      include: {
        interview: {
          select: {
            id: true,
            projectId: true,
            participant: { select: { id: true, displayName: true } },
          },
        },
        _count: { select: { segments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findForInterview(interviewId: string, organizationId: string) {
    return this.prisma.transcript.findMany({
      where: { interviewId, organizationId },
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
   * Stores a human correction next to the machine text (which is never
   * changed). `null`, blank, or text identical to the machine version
   * clears the correction. A correction may not remove words that a
   * finding quotes from this segment: the evidence must stay verbatim.
   */
  async editSegment(
    transcriptId: string,
    segmentId: string,
    text: string | null,
    userId: string,
    organizationId: string,
  ) {
    const segment = await this.prisma.transcriptSegment.findFirst({
      where: { id: segmentId, transcriptId, organizationId },
      include: {
        transcript: { select: { status: true } },
        quotations: { select: { excerpt: true } },
      },
    });
    if (!segment) {
      throw new NotFoundException('Transcript segment not found');
    }
    if (segment.transcript.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Only a completed transcript can be edited',
      );
    }

    const corrected = text?.trim() || null;
    const editedText = corrected === segment.text ? null : corrected;
    const effective = editedText ?? segment.text;

    const broken = segment.quotations.find(
      (q) => !effective.includes(q.excerpt),
    );
    if (broken) {
      throw new BadRequestException(
        `A finding quotes "${broken.excerpt.slice(0, 80)}" from this segment; keep those words unchanged`,
      );
    }

    return this.prisma.transcriptSegment.update({
      where: { id: segment.id },
      data: {
        ...(editedText
          ? { editedText, editedById: userId, editedAt: new Date() }
          : { editedText: null, editedById: null, editedAt: null }),
        // A translation of the old wording would now be misleading.
        ...(effective !== segmentText(segment) && { translatedText: null }),
      },
      include: {
        editedBy: { select: { id: true, firstName: true, lastName: true } },
      },
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
