import { API } from '@/lib/api-client';
import type { ApiError } from '@/types/api';
import { UploadError, type PendingInterviewTransport, type UploadTransport } from './types';

function toUploadError(err: unknown): UploadError {
  const apiError = err as Partial<ApiError> | undefined;
  return new UploadError(apiError?.message || 'Upload failed', apiError?.status ?? 0);
}

/** The outbox's server calls, over the shared API client (same auth, same errors). */
export const apiUploadTransport: UploadTransport = {
  async status(interviewId, uploadId) {
    try {
      const res = await API.interviews.recordingUploadStatus(interviewId, uploadId);
      const body = res.data.data;
      return { receivedParts: body.receivedParts, completed: body.completed ? { id: body.completed.id } : null };
    } catch (err) {
      throw toUploadError(err);
    }
  },
  async putPart(interviewId, uploadId, index, part) {
    const form = new FormData();
    form.append('chunk', part, `part-${index}`);
    try {
      await API.interviews.putRecordingPart(interviewId, uploadId, index, form);
    } catch (err) {
      throw toUploadError(err);
    }
  },
  async complete(interviewId, uploadId, body) {
    try {
      const res = await API.interviews.completeRecordingUpload(interviewId, uploadId, body);
      return { id: res.data.data.id };
    } catch (err) {
      throw toUploadError(err);
    }
  },
};

/** Creates an on-site interview (participant + consent + interview) on the server. */
export const apiPendingTransport: PendingInterviewTransport = {
  async create(p) {
    try {
      await API.field.createInterview({
        interviewId: p.id,
        participantId: p.participantId,
        consentId: p.consentId,
        projectId: p.projectId,
        participant: p.participant,
        consent: p.consent,
        location: p.location,
        language: p.language,
      });
    } catch (err) {
      throw toUploadError(err);
    }
  },
};
