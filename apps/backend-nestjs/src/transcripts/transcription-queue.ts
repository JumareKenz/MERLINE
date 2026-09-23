import type { Prisma, PrismaClient, Transcript } from '@prisma/client';
import { consentBlockReason } from '../consents/consents.service';
import { enqueueJob } from '../jobs/enqueue';

type Db = PrismaClient | Prisma.TransactionClient;

export const TRANSCRIPTION_JOB = 'transcription';
export const TRANSLATION_JOB = 'translation';

/**
 * Plain functions over Prisma, so the upload path (InterviewsService) can
 * queue a transcript without depending on TranscriptsModule's providers.
 */
export function queueTranscription(
  db: Db,
  transcript: Pick<Transcript, 'id' | 'organizationId'>,
) {
  return enqueueJob(db, {
    type: TRANSCRIPTION_JOB,
    organizationId: transcript.organizationId,
    payload: { transcriptId: transcript.id },
    dedupeKey: `${TRANSCRIPTION_JOB}:${transcript.id}`,
  });
}

export function queueTranslation(
  db: Db,
  transcript: Pick<Transcript, 'id' | 'organizationId'>,
  targetLanguage: string,
) {
  return enqueueJob(db, {
    type: TRANSLATION_JOB,
    organizationId: transcript.organizationId,
    payload: { transcriptId: transcript.id, targetLanguage },
    dedupeKey: `${TRANSLATION_JOB}:${transcript.id}`,
    maxAttempts: 4,
  });
}

/**
 * Called when a recording finishes uploading. Queues transcription when the
 * participant's consent allows it and nothing is transcribing (or has
 * transcribed) this recording yet. Returns the new transcript, or null when
 * nothing was queued — never throws for a consent that does not allow it:
 * the upload itself was legitimate.
 */
export async function queueTranscriptionForRecording(
  db: Db,
  params: {
    mediaId: string;
    interviewId: string;
    organizationId: string;
    requestedById: string;
  },
): Promise<Transcript | null> {
  const media = await db.media.findFirst({
    where: {
      id: params.mediaId,
      interviewId: params.interviewId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true, mimeType: true },
  });
  if (!media) return null;
  if (!/^(audio|video)\//.test(media.mimeType)) return null;

  const interview = await db.interview.findFirst({
    where: {
      id: params.interviewId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    include: { consent: true },
  });
  if (!interview) return null;
  if (consentBlockReason(interview.consent, 'allowTranscription')) return null;

  const existing = await db.transcript.findFirst({
    where: { mediaId: media.id, status: { not: 'FAILED' } },
    select: { id: true },
  });
  if (existing) return null;

  const transcript = await db.transcript.create({
    data: {
      status: 'PENDING',
      organizationId: params.organizationId,
      interviewId: interview.id,
      mediaId: media.id,
      requestedById: params.requestedById,
      requestedLanguage: interview.language,
    },
  });
  await queueTranscription(db, transcript);
  return transcript;
}
