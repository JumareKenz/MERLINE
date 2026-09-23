import type { LocalRecording, RecordingRepo, UploadTransport } from './types';
import { UploadError } from './types';

/**
 * Upload parts are small so a weak or intermittent connection only ever has
 * to re-send one short request, never the whole interview. At the field
 * recorder's ~24 kbps, 512 KiB is roughly three minutes of audio.
 */
export const PART_SIZE = 512 * 1024;

const BASE_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;

export function backoffMs(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export type OutboxRunResult =
  /** Nothing left that is due. */
  | 'idle'
  /** Stopped because the device is offline; try again when it reconnects. */
  | 'offline'
  /** Stopped because the session is no longer valid; needs sign-in. */
  | 'unauthorized';

export interface OutboxDeps {
  repo: RecordingRepo;
  transport: UploadTransport;
  userId: string;
  now?: () => number;
  /** Reports each change so the UI can show live progress. */
  onChange?: (recording: LocalRecording) => void;
  /**
   * Recordings for which this returns true wait (they stay queued, not
   * failed) — e.g. audio of an interview started on site whose interview
   * does not exist on the server yet.
   */
  isWaiting?: (recording: LocalRecording) => boolean;
}

/** A recording is due when it is waiting and any backoff has elapsed. */
export function isDue(recording: LocalRecording, now: number): boolean {
  if (recording.status === 'queued' || recording.status === 'uploading') return true;
  if (recording.status !== 'failed') return false;
  return !recording.nextAttemptAt || Date.parse(recording.nextAttemptAt) <= now;
}

/**
 * Called once at app start: a row still marked `recording` means the app
 * closed mid-interview. Its slices are intact up to the last one written,
 * and consecutive MediaRecorder slices form a playable file, so it is
 * queued rather than discarded. `uploading` rows were interrupted too and
 * simply resume.
 */
export async function recoverInterrupted(repo: RecordingRepo, activeId?: string): Promise<number> {
  let recovered = 0;
  for (const recording of await repo.list()) {
    if (recording.status === 'recording' && recording.id !== activeId) {
      await repo.put({
        ...recording,
        status: recording.sliceCount > 0 ? 'queued' : 'failed',
        recovered: true,
        lastError: recording.sliceCount > 0 ? undefined : 'No audio was captured before the app closed.',
        updatedAt: new Date().toISOString(),
      });
      recovered++;
    }
  }
  return recovered;
}

/**
 * Uploads every due recording belonging to `userId`, oldest first, one at a
 * time (a field connection rarely benefits from parallel uploads, and
 * sequential keeps progress legible). Stops early when offline or signed
 * out, so the caller can resume on the next `online` event or sign-in.
 */
export async function runOutbox(deps: OutboxDeps): Promise<OutboxRunResult> {
  const now = deps.now ?? Date.now;
  const due = (await deps.repo.list())
    .filter((r) => r.userId === deps.userId && isDue(r, now()) && !deps.isWaiting?.(r))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const recording of due) {
    const outcome = await uploadOne(recording, deps);
    if (outcome === 'offline' || outcome === 'unauthorized') return outcome;
  }
  return 'idle';
}

type OneOutcome = 'uploaded' | 'failed' | 'blocked' | 'offline' | 'unauthorized';

async function uploadOne(initial: LocalRecording, deps: OutboxDeps): Promise<OneOutcome> {
  const { repo, transport } = deps;
  const now = deps.now ?? Date.now;
  let recording: LocalRecording = initial;

  const save = async (patch: Partial<LocalRecording>) => {
    recording = { ...recording, ...patch, updatedAt: new Date(now()).toISOString() };
    await repo.put(recording);
    deps.onChange?.(recording);
  };

  try {
    await save({ status: 'uploading', lastError: undefined });

    const audio = await repo.readAudio(recording.id, recording.mimeType);
    if (audio.size === 0) {
      await save({ status: 'blocked', lastError: 'This recording has no audio on the device.' });
      return 'blocked';
    }

    if (!recording.checksum || !recording.totalParts) {
      await save({
        checksum: await sha256Hex(audio),
        totalParts: Math.max(1, Math.ceil(audio.size / PART_SIZE)),
        size: audio.size,
      });
    }
    const totalParts = recording.totalParts as number;

    // Ask the server what it already has: resumes across app restarts and
    // recognises an upload that completed but whose response was lost.
    const status = await transport.status(recording.interviewId, recording.id);
    if (status.completed) {
      return await finish(status.completed.id);
    }

    const received = new Set(status.receivedParts);
    await save({ uploadedParts: [...received].sort((a, b) => a - b) });

    for (let index = 0; index < totalParts; index++) {
      if (received.has(index)) continue;
      const part = audio.slice(index * PART_SIZE, Math.min(audio.size, (index + 1) * PART_SIZE));
      await transport.putPart(recording.interviewId, recording.id, index, part);
      received.add(index);
      await save({ uploadedParts: [...received].sort((a, b) => a - b) });
    }

    const media = await transport.complete(recording.interviewId, recording.id, {
      totalParts,
      mimeType: recording.mimeType,
      originalName: recording.originalName,
      checksum: recording.checksum,
      durationMs: recording.durationMs || undefined,
      recordedAt: recording.createdAt,
    });
    return await finish(media.id);
  } catch (err) {
    const error =
      err instanceof UploadError
        ? err
        : new UploadError(err instanceof Error ? err.message : 'Upload failed', 0);
    return fail(error);
  }

  async function finish(mediaId: string): Promise<OneOutcome> {
    // Free device storage only once the server has confirmed it holds the
    // complete, checksum-verified recording.
    await repo.deleteAudio(recording.id);
    await save({
      status: 'uploaded',
      mediaId,
      uploadedAt: new Date(now()).toISOString(),
      uploadedParts: [],
      lastError: undefined,
      nextAttemptAt: undefined,
    });
    return 'uploaded';
  }

  async function fail(error: UploadError): Promise<OneOutcome> {
    const attempts = recording.attempts + 1;

    if (error.status === 401) {
      await save({ status: 'queued', lastError: 'Sign in again to continue uploading.' });
      return 'unauthorized';
    }
    if (error.status === 403 || error.status === 404) {
      // Consent does not permit recording, or the interview is not (or no
      // longer) assigned to this user. Retrying cannot fix either; the
      // audio stays on the device until the interviewer decides.
      await save({ status: 'blocked', attempts, lastError: error.message });
      return 'blocked';
    }
    if (error.status === 400 && /checksum/i.test(error.message)) {
      // The server discarded the parts; start over from part 0.
      await save({
        status: 'failed',
        attempts,
        uploadedParts: [],
        lastError: error.message,
        nextAttemptAt: new Date(now() + backoffMs(attempts)).toISOString(),
      });
      return 'failed';
    }

    const offline = error.status === 0;
    await save({
      status: 'failed',
      attempts: offline ? recording.attempts : attempts,
      lastError: offline ? 'Waiting for a connection.' : error.message,
      nextAttemptAt: new Date(now() + (offline ? 0 : backoffMs(attempts))).toISOString(),
    });
    return offline ? 'offline' : 'failed';
  }
}
