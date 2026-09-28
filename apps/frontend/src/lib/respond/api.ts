import type { PublicLink, RespondentSessionState } from '@/types/respondent-link';

/**
 * The respondent's API client. Deliberately not `apiClient`: that one
 * attaches a signed-in user's token and signs them out on any 401, and a
 * respondent has no account (an admin testing their own link must not be
 * signed out by it either). Plain fetch, with a timeout, and one error
 * shape: `status` 0 means the request never reached the server.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export class RespondError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
  /** Worth trying again: no connection, a timeout, rate limiting or a server fault. */
  get retryable() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT';
  json?: unknown;
  form?: FormData;
  key?: string;
  timeoutMs?: number;
}

async function call<T>(path: string, opts: CallOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.json !== undefined && { 'Content-Type': 'application/json' }),
        ...(opts.key && { 'X-Respondent-Key': opts.key }),
      },
      body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    throw new RespondError('No connection to the server.', 0);
  } finally {
    clearTimeout(timer);
  }
  let body: { data?: T; message?: string | string[] } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const raw = body?.message;
    const message = Array.isArray(raw) ? raw.join(' ') : raw;
    throw new RespondError(message || (res.status >= 500 ? 'The server had a problem.' : 'Something went wrong.'), res.status);
  }
  return (body?.data ?? (body as T)) as T;
}

const enc = encodeURIComponent;
const base = (token: string) => `/respond/${enc(token)}`;
const session = (token: string, sessionId: string) => `${base(token)}/sessions/${enc(sessionId)}`;

export interface StartInput {
  sessionId: string;
  secret: string;
  respondent: { name: string; role?: string; organisation?: string };
  consent: {
    allowRecording: boolean;
    allowTranscription: boolean;
    allowAiAnalysis: boolean;
    allowQuotation: boolean;
    allowPublication: boolean;
  };
  language?: string;
}

export interface AnswerEntry {
  questionId: string;
  status: 'ASKED' | 'SKIPPED';
  atMs?: number;
  recordingRef?: string;
  selected?: number[];
  value?: number;
  markedAt: string;
}

export const respondApi = {
  link: (token: string) => call<PublicLink>(base(token)),
  start: (token: string, input: StartInput) =>
    call<RespondentSessionState>(`${base(token)}/sessions`, { method: 'POST', json: input }),
  state: (token: string, sessionId: string, key: string) =>
    call<RespondentSessionState>(session(token, sessionId), { key }),
  uploadStatus: (token: string, sessionId: string, key: string, uploadId: string) =>
    call<{ receivedParts: number[]; completed: { id: string } | null }>(
      `${session(token, sessionId)}/uploads/${enc(uploadId)}`,
      { key },
    ),
  putPart: (token: string, sessionId: string, key: string, uploadId: string, index: number, chunk: Blob) => {
    const form = new FormData();
    form.append('chunk', chunk, `part-${index}`);
    // A 512 KiB part on a weak 2G link can take well over a minute.
    return call<{ index: number }>(`${session(token, sessionId)}/uploads/${enc(uploadId)}/parts/${index}`, {
      method: 'PUT',
      form,
      key,
      timeoutMs: 120_000,
    });
  },
  complete: (
    token: string,
    sessionId: string,
    key: string,
    uploadId: string,
    body: { totalParts: number; mimeType: string; durationMs?: number },
  ) =>
    call<{ id: string }>(`${session(token, sessionId)}/uploads/${enc(uploadId)}/complete`, {
      method: 'POST',
      json: body,
      key,
      timeoutMs: 120_000,
    }),
  answers: (token: string, sessionId: string, key: string, entries: AnswerEntry[]) =>
    call<{ saved: number }>(`${session(token, sessionId)}/answers`, { method: 'PUT', json: { entries }, key }),
  finish: (token: string, sessionId: string, key: string) =>
    call<{ finished: boolean }>(`${session(token, sessionId)}/finish`, { method: 'POST', key }),
};

/** A url-safe random secret; only its hash is kept on the server. */
export function newSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Older Safari: RFC 4122 v4 from getRandomValues.
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
