import type { InterviewSnapshot, LocalRecording, RecordingRepo } from './types';

/**
 * IndexedDB storage for the field app. Deliberately dependency-free: this
 * runs on low-end phones, so it adds no bundle weight beyond these helpers.
 *
 * Stores:
 *   recordings  LocalRecording rows (metadata and upload state)
 *   slices      audio, as the recorder produced it: [recordingId, seq] -> Blob
 *   snapshots   the signed-in user's assigned interviews, for offline use
 *
 * All of it is origin-private device storage. `clearFieldData` removes the
 * interview snapshot on sign-out; unsent audio is kept (it is irreplaceable)
 * but is bound to its userId and only ever uploaded by that user's session.
 */
const DB_NAME = 'merline-field';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('recordings')) {
        db.createObjectStore('recordings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('slices')) {
        db.createObjectStore('slices', { keyPath: ['recordingId', 'seq'] });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgraded the schema: drop this handle so the next call reopens.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Could not open device storage'));
    };
  });
  return dbPromise;
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Device storage write was aborted'));
  });
}

function sliceRange(recordingId: string): IDBKeyRange {
  return IDBKeyRange.bound([recordingId, 0], [recordingId, Number.MAX_SAFE_INTEGER]);
}

export const idbRecordingRepo: RecordingRepo = {
  async get(id) {
    const db = await openDb();
    return done(db.transaction('recordings').objectStore('recordings').get(id)) as Promise<
      LocalRecording | undefined
    >;
  },

  async list() {
    const db = await openDb();
    return done(db.transaction('recordings').objectStore('recordings').getAll()) as Promise<LocalRecording[]>;
  },

  async put(recording) {
    const db = await openDb();
    const tx = db.transaction('recordings', 'readwrite');
    tx.objectStore('recordings').put(recording);
    await committed(tx);
  },

  async delete(id) {
    const db = await openDb();
    const tx = db.transaction(['recordings', 'slices'], 'readwrite');
    tx.objectStore('recordings').delete(id);
    tx.objectStore('slices').delete(sliceRange(id));
    await committed(tx);
  },

  async appendSlice(recordingId, seq, blob) {
    const db = await openDb();
    const tx = db.transaction(['slices', 'recordings'], 'readwrite');
    tx.objectStore('slices').put({ recordingId, seq, blob });
    // Keep the metadata row in step in the same transaction, so a crash can
    // never leave audio that the row does not account for.
    const recordings = tx.objectStore('recordings');
    const read = recordings.get(recordingId);
    read.onsuccess = () => {
      const row = read.result as LocalRecording | undefined;
      if (row) {
        recordings.put({
          ...row,
          size: row.size + blob.size,
          sliceCount: Math.max(row.sliceCount, seq + 1),
          updatedAt: new Date().toISOString(),
        });
      }
    };
    await committed(tx);
  },

  async readAudio(recordingId, mimeType) {
    const db = await openDb();
    const rows = (await done(
      db.transaction('slices').objectStore('slices').getAll(sliceRange(recordingId)),
    )) as { seq: number; blob: Blob }[];
    rows.sort((a, b) => a.seq - b.seq);
    return new Blob(
      rows.map((r) => r.blob),
      { type: mimeType },
    );
  },

  async deleteAudio(recordingId) {
    const db = await openDb();
    const tx = db.transaction('slices', 'readwrite');
    tx.objectStore('slices').delete(sliceRange(recordingId));
    await committed(tx);
  },
};

export async function saveSnapshot(snapshot: InterviewSnapshot): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('snapshots', 'readwrite');
  tx.objectStore('snapshots').put(snapshot);
  await committed(tx);
}

export async function loadSnapshot(userId: string): Promise<InterviewSnapshot | undefined> {
  const db = await openDb();
  return done(db.transaction('snapshots').objectStore('snapshots').get(userId)) as Promise<
    InterviewSnapshot | undefined
  >;
}

/** On sign-out: forget cached participant/interview details. Unsent audio stays. */
export async function clearFieldData(): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  const db = await openDb();
  const tx = db.transaction('snapshots', 'readwrite');
  tx.objectStore('snapshots').clear();
  await committed(tx);
}
