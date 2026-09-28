import type { AnswerEntry } from './api';

/**
 * What a respondent's browser keeps so a reload, a crash or a lost
 * connection never loses their interview: the session (localStorage) and
 * the audio as it is recorded (IndexedDB, in 5-second slices). Cleared once
 * the interview is submitted. If storage is unavailable (some private
 * windows) everything still works, just without surviving a reload.
 */

export interface SavedRecording {
  id: string;
  mimeType: string;
  durationMs: number;
  bytes: number;
  slices: number;
  /** False while recording; a reload mid-recording ends it where it was. */
  stopped: boolean;
}

export interface SavedSession {
  sessionId: string;
  secret: string;
  language: string;
  name: string;
  questionIndex: number;
  answers: Record<string, AnswerEntry>;
  recording?: SavedRecording;
  /** Parts the server has confirmed, for the current recording. */
  uploadedParts?: number[];
  completedUploadId?: string;
}

const KEY = (token: string) => `merline-respond:${token}`;

export const sessionStore = {
  load(token: string): SavedSession | null {
    try {
      const raw = localStorage.getItem(KEY(token));
      return raw ? (JSON.parse(raw) as SavedSession) : null;
    } catch {
      return null;
    }
  },
  save(token: string, s: SavedSession) {
    try {
      localStorage.setItem(KEY(token), JSON.stringify(s));
    } catch {
      /* storage full or blocked: the in-memory copy still works */
    }
  },
  clear(token: string) {
    try {
      localStorage.removeItem(KEY(token));
    } catch {
      /* ignore */
    }
  },
};

const DB = 'merline-respond';
const STORE = 'slices';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
const db = () => (dbPromise ??= openDb());

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise<T | undefined>((resolve, reject) => {
        if (!d) return resolve(undefined);
        const t = d.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => resolve(req ? (req.result as T) : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

const sliceKey = (recordingId: string, seq: number) => `${recordingId}:${String(seq).padStart(6, '0')}`;

export const audioStore = {
  async put(recordingId: string, seq: number, blob: Blob) {
    await tx('readwrite', (s) => s.put(blob, sliceKey(recordingId, seq)));
  },
  /** Every saved slice of a recording, in order; empty if none survived. */
  async read(recordingId: string, count: number): Promise<Blob[]> {
    const out: Blob[] = [];
    for (let i = 0; i < count; i++) {
      const b = await tx<Blob>('readonly', (s) => s.get(sliceKey(recordingId, i)));
      if (!b) break;
      out.push(b);
    }
    return out;
  },
  async remove(recordingId: string) {
    await tx('readwrite', (s) => s.delete(IDBKeyRange.bound(`${recordingId}:`, `${recordingId}:￿`)));
  },
};
