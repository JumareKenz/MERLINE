import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Transcript } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { ConsentsService } from '../consents/consents.service';
import { StorageService } from '../storage/storage.service';
import { TranscriptionProviderService } from './transcription-provider.service';

@Injectable()
export class TranscriptsService extends BaseService {
  private readonly logger = new Logger(TranscriptsService.name);

  constructor(
    prisma: PrismaService,
    private readonly consentsService: ConsentsService,
    private readonly storageService: StorageService,
    private readonly transcriptionProvider: TranscriptionProviderService,
  ) {
    super(prisma);
  }

  async findById(id: string, organizationId: string) {
    const transcript = await this.prisma.transcript.findFirst({
      where: { id, organizationId },
      include: { segments: { orderBy: { index: 'asc' } } },
    });

    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }

    return transcript;
  }

  async findForInterview(interviewId: string, organizationId: string) {
    return this.prisma.transcript.findMany({
      where: { interviewId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates the Transcript row and immediately attempts processing. There is
   * no background queue yet (known gap — Redis is provisioned, unused), so
   * this call is synchronous: it blocks for the duration of the transcription
   * call and returns either a COMPLETED transcript with real segments, or
   * throws after leaving a durable FAILED row behind for `retry` to pick up.
   */
  async requestTranscript(
    interviewId: string,
    mediaId: string,
    userId: string,
    organizationId: string,
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

    const transcript = await this.prisma.transcript.create({
      data: {
        status: 'PENDING',
        organizationId,
        interviewId,
        mediaId,
        requestedById: userId,
      },
    });

    return this.process(
      transcript,
      media.path,
      media.mimeType,
      media.filename,
      organizationId,
    );
  }

  /** Re-attempts processing for a transcript left in FAILED. Re-checks consent. */
  async retry(id: string, organizationId: string): Promise<Transcript> {
    const transcript = await this.prisma.transcript.findFirst({
      where: { id, organizationId },
    });
    if (!transcript) {
      throw new NotFoundException('Transcript not found');
    }
    if (transcript.status !== 'FAILED') {
      throw new BadRequestException(
        `Cannot retry a transcript in status ${transcript.status}`,
      );
    }

    const interview = await this.prisma.interview.findFirstOrThrow({
      where: { id: transcript.interviewId },
    });
    const consent = await this.consentsService.findById(
      interview.consentId,
      organizationId,
    );
    this.consentsService.assertScope(consent, 'allowTranscription');

    const media = await this.prisma.media.findFirstOrThrow({
      where: { id: transcript.mediaId },
    });

    return this.process(
      transcript,
      media.path,
      media.mimeType,
      media.filename,
      organizationId,
    );
  }

  private async process(
    transcript: Transcript,
    objectKey: string,
    mimeType: string,
    filename: string,
    organizationId: string,
  ): Promise<Transcript> {
    await this.prisma.transcript.update({
      where: { id: transcript.id },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      const audio = await this.readObject(objectKey);
      const result = await this.transcriptionProvider.transcribe(
        audio,
        mimeType,
        filename,
      );

      return await this.executeTransaction(async (tx) => {
        // Re-running (retry) must not duplicate segments from a prior attempt.
        await tx.transcriptSegment.deleteMany({
          where: { transcriptId: transcript.id },
        });

        await tx.transcriptSegment.createMany({
          data: result.segments.map((segment) => ({
            transcriptId: transcript.id,
            organizationId,
            index: segment.index,
            startMs: segment.startMs,
            endMs: segment.endMs,
            text: segment.text,
          })),
        });

        return tx.transcript.update({
          where: { id: transcript.id },
          data: {
            status: 'COMPLETED',
            provider: result.provider,
            language: result.language,
            completedAt: new Date(),
            errorMessage: null,
          },
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Transcript ${transcript.id} failed: ${message}`);

      await this.prisma.transcript.update({
        where: { id: transcript.id },
        data: { status: 'FAILED', errorMessage: message },
      });

      // Same contract as AiGatewayService: fail loudly, never fabricate.
      throw new ServiceUnavailableException({
        message,
        transcriptId: transcript.id,
        status: 'FAILED',
      });
    }
  }

  private async readObject(key: string): Promise<Buffer> {
    const stream = await this.storageService.getObjectStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
