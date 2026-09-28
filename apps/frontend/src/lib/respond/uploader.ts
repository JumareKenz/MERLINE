import { RespondError, respondApi } from './api';

/** Same part size as the field app: small enough for a weak mobile link. */
export const PART_BYTES = 512 * 1024;

export type UploadPhase = 'idle' | 'uploading' | 'waiting' | 'done' | 'error';

export interface UploadProgress {
  phase: UploadPhase;
  uploadedBytes: number;
  totalBytes: number;
  /** Set when phase is 'error' (not retryable) or 'waiting' (why). */
  message?: string;
}

interface Options {
  token: string;
  sessionId: string;
  secret: string;
  uploadId: string;
  mimeType: string;
  /** Parts the server already has (after a reload). */
  uploadedParts?: number[];
  onProgress: (p: UploadProgress) => void;
  onPartsChange?: (parts: number[]) => void;
  /** Wait before retry n (tests pass a zero backoff). */
  backoffMs?: (attempt: number) => number;
}

export const defaultBackoff = (attempt: number) => Math.min(30_000, 1500 * 2 ** Math.min(attempt, 5));

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    const hasWindow = typeof window !== 'undefined';
    const done = () => {
      clearTimeout(timer);
      if (hasWindow) window.removeEventListener('online', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    // Back online: try again at once rather than waiting out the backoff.
    if (hasWindow) window.addEventListener('online', done);
  });

/**
 * Uploads a recording that may still be growing. Audio arrives as slices;
 * the uploader sends each full 512 KiB part as soon as it exists, so by the
 * time the respondent presses Finish most of it is already on the server.
 * Parts are byte ranges of the whole recording, so the server reassembles
 * exactly what was recorded. Failed parts are retried with backoff for as
 * long as the page is open; only a refusal (consent, invalid session) stops
 * it.
 */
export class StreamUploader {
  private slices: Blob[] = [];
  private total = 0;
  private sealed = false;
  private readonly done = new Set<number>();
  private loop: Promise<void> | null = null;
  private fatal: RespondError | null = null;
  private stopped = false;
  private attempt = 0;

  constructor(private readonly o: Options) {
    for (const p of o.uploadedParts ?? []) this.done.add(p);
  }

  get uploadId() {
    return this.o.uploadId;
  }

  append(blob: Blob) {
    if (!blob.size) return;
    this.slices.push(blob);
    this.total += blob.size;
    this.kick();
  }

  /** No more audio is coming: the last, shorter part may now be sent. */
  seal() {
    this.sealed = true;
    this.kick();
  }

  /** Stop for good (the respondent started again). */
  cancel() {
    this.stopped = true;
  }

  private partCount() {
    return this.sealed ? Math.ceil(this.total / PART_BYTES) : Math.floor(this.total / PART_BYTES);
  }

  private nextPart(): number | null {
    const n = this.partCount();
    for (let i = 0; i < n; i++) if (!this.done.has(i)) return i;
    return null;
  }

  private uploadedBytes() {
    let b = 0;
    this.done.forEach((i) => (b += Math.min(PART_BYTES, Math.max(0, this.total - i * PART_BYTES))));
    return b;
  }

  private report(phase: UploadPhase, message?: string) {
    this.o.onProgress({ phase, uploadedBytes: this.uploadedBytes(), totalBytes: this.total, message });
  }

  private kick() {
    if (this.loop || this.fatal || this.stopped) return;
    this.loop = this.run().finally(() => {
      this.loop = null;
      // Audio that arrived while the last part was in flight.
      if (!this.fatal && !this.stopped && this.nextPart() !== null) this.kick();
    });
  }

  private async run() {
    let index: number | null;
    while (!this.stopped && (index = this.nextPart()) !== null) {
      const start = index * PART_BYTES;
      const chunk = new Blob(this.slices).slice(start, Math.min(start + PART_BYTES, this.total));
      this.report('uploading');
      try {
        await respondApi.putPart(this.o.token, this.o.sessionId, this.o.secret, this.o.uploadId, index, chunk);
        this.done.add(index);
        this.attempt = 0;
        this.o.onPartsChange?.([...this.done].sort((a, b) => a - b));
        this.report('uploading');
      } catch (err) {
        const e = err instanceof RespondError ? err : new RespondError('Upload failed.', 0);
        if (!e.retryable) {
          this.fatal = e;
          this.report('error', e.message);
          return;
        }
        this.attempt++;
        this.report('waiting', e.status === 0 ? 'Waiting for a connection…' : 'The server is busy; trying again…');
        await sleep((this.o.backoffMs ?? defaultBackoff)(this.attempt));
      }
    }
  }

  /**
   * Sends whatever is left and asks the server to assemble the recording.
   * Resolves once it is stored; keeps retrying through lost connections.
   */
  async finish(durationMs: number): Promise<void> {
    this.seal();
    for (;;) {
      if (this.stopped) throw new RespondError('Upload cancelled.', 499);
      if (this.fatal) throw this.fatal;
      if (this.loop) {
        await this.loop;
        continue;
      }
      if (this.nextPart() !== null) {
        this.kick();
        continue;
      }
      break;
    }
    const totalParts = this.partCount();
    if (totalParts === 0) throw new RespondError('No audio was recorded.', 400);
    for (let attempt = 1; ; attempt++) {
      try {
        this.report('uploading');
        await respondApi.complete(this.o.token, this.o.sessionId, this.o.secret, this.o.uploadId, {
          totalParts,
          mimeType: this.o.mimeType,
          durationMs: Math.round(durationMs),
        });
        this.report('done');
        return;
      } catch (err) {
        const e = err instanceof RespondError ? err : new RespondError('Upload failed.', 0);
        if (!e.retryable) {
          this.report('error', e.message);
          throw e;
        }
        this.report('waiting', e.status === 0 ? 'Waiting for a connection…' : 'The server is busy; trying again…');
        await sleep((this.o.backoffMs ?? defaultBackoff)(attempt));
      }
    }
  }
}
