import type { FieldGuide } from '@/types/field';
/**
 * Field app — offline recording and upload outbox.
 *
 * A recording lives on the device from the first second it is captured:
 * audio is appended to IndexedDB in small slices while the interview is in
 * progress, so a crash, a closed tab or a dead battery loses at most the
 * last slice, and no connection is needed until upload.
 */

export type LocalRecordingStatus =
  /** Capturing right now. On app start, any row still in this state was interrupted. */
  | 'recording'
  /** Waiting for a connection / its next attempt. */
  | 'queued'
  | 'uploading'
  /** On the server. Audio has been removed from the device. */
  | 'uploaded'
  /** Last attempt failed with a retryable error; `nextAttemptAt` says when. */
  | 'failed'
  /** The server refused it for a reason retrying cannot fix (consent, access). */
  | 'blocked';

export interface LocalRecording {
  /** UUID. Also the server-side upload id, which makes every upload step idempotent. */
  id: string;
  /** Only this user's session may upload it. */
  userId: string;
  interviewId: string;
  /** For display only, captured while online. */
  participantName?: string;
  mimeType: string;
  source: 'recorder' | 'file';
  originalName: string;
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  /** Bytes of audio held on the device (sum of slices). */
  size: number;
  sliceCount: number;
  status: LocalRecordingStatus;
  /** Set when the app was closed mid-recording and the audio was recovered. */
  recovered?: boolean;
  totalParts?: number;
  checksum?: string;
  uploadedParts: number[];
  attempts: number;
  nextAttemptAt?: string;
  lastError?: string;
  mediaId?: string;
  uploadedAt?: string;
}

export interface CachedInterview {
  id: string;
  status: string;
  /** The guide version this interview uses. */
  questionSetId?: string | null;
  language?: string | null;
  scheduledAt?: string | null;
  location?: string | null;
  notes?: string | null;
  participantId: string;
  participantName?: string;
  projectId?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  consent?: {
    id: string;
    method?: string;
    allowRecording: boolean;
    withdrawnAt?: string | null;
    expiresAt?: string | null;
  } | null;
  recordingCount?: number;
}

export interface CachedProject {
  id: string;
  name: string;
  method?: string | null;
  /** The approved guide, kept on the phone so questions show offline. */
  guide?: FieldGuide | null;
}

/** One question marked during an interview (kept on the phone until sent). */
export interface QuestionMark {
  questionId: string;
  status: 'ASKED' | 'SKIPPED' | 'CLEAR';
  /** Position in the recording when asked, if one was running. */
  atMs?: number;
  /** The local recording id, which becomes the stored recording's upload id. */
  recordingRef?: string;
  markedAt: string;
}

export interface QuestionLogRecord {
  interviewId: string;
  marks: QuestionMark[];
  /** False while there are marks the server has not confirmed. */
  synced: boolean;
}

export interface InterviewSnapshot {
  userId: string;
  savedAt: string;
  items: CachedInterview[];
  /** Projects the worker may start interviews in (for offline starts). */
  projects?: CachedProject[];
}

/**
 * An interview started on site — participant, consent and interview —
 * held on the device until the server has created them. Recordings for it
 * wait in the outbox until then; consent was captured before recording.
 */
export interface PendingInterview {
  /** Also the server-side interview id (generated on the device). */
  id: string;
  participantId: string;
  consentId: string;
  userId: string;
  projectId: string;
  projectName?: string;
  participant: { displayName: string; externalRef?: string };
  consent: {
    version: string;
    method: 'VERBAL' | 'WRITTEN' | 'DIGITAL';
    allowRecording: boolean;
    allowTranscription: boolean;
    allowAiAnalysis: boolean;
    allowQuotation: boolean;
    allowPublication: boolean;
    capturedAt: string;
  };
  location?: string;
  /** The guide version shown on the phone when the interview began. */
  questionSetId?: string;
  /** Language spoken (e.g. "ha"): the transcription hint. */
  language?: string;
  createdAt: string;
  status: 'pending' | 'synced' | 'blocked';
  lastError?: string;
  attempts: number;
}

export interface PendingInterviewTransport {
  create(p: PendingInterview): Promise<void>;
}

/** Storage the outbox depends on. IndexedDB in the app, in-memory in tests. */
export interface RecordingRepo {
  get(id: string): Promise<LocalRecording | undefined>;
  list(): Promise<LocalRecording[]>;
  put(recording: LocalRecording): Promise<void>;
  delete(id: string): Promise<void>;
  appendSlice(recordingId: string, seq: number, blob: Blob): Promise<void>;
  /** All slices, in order, as one Blob. */
  readAudio(recordingId: string, mimeType: string): Promise<Blob>;
  deleteAudio(recordingId: string): Promise<void>;
}

export class UploadError extends Error {
  constructor(
    message: string,
    /** 0 = no response (offline / timeout). */
    readonly status: number,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/** Server calls the outbox makes. Implemented over the API client in the app. */
export interface UploadTransport {
  status(
    interviewId: string,
    uploadId: string,
  ): Promise<{ receivedParts: number[]; completed: { id: string } | null }>;
  putPart(interviewId: string, uploadId: string, index: number, part: Blob): Promise<void>;
  complete(
    interviewId: string,
    uploadId: string,
    body: {
      totalParts: number;
      mimeType: string;
      originalName: string;
      checksum?: string;
      durationMs?: number;
      recordedAt?: string;
    },
  ): Promise<{ id: string }>;
}
