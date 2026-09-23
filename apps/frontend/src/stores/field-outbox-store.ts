'use client';

import { create } from 'zustand';
import { idbRecordingRepo, isIndexedDbAvailable } from '@/lib/field/idb';
import { recoverInterrupted, runOutbox, type OutboxRunResult } from '@/lib/field/outbox';
import { apiUploadTransport } from '@/lib/field/transport';
import type { LocalRecording } from '@/lib/field/types';

/**
 * Drives the field app's upload outbox and mirrors device recordings into
 * React state. Uploads run in the foreground only — when the app starts,
 * comes back into view, regains a connection, or every 30 s while open.
 * (Background Sync is not dependable on iOS, so it is not relied on; the
 * UI says plainly that the app must be opened for uploads to continue.)
 */
interface OutboxState {
  available: boolean;
  userId: string | null;
  recordings: LocalRecording[];
  running: boolean;
  lastResult: OutboxRunResult | null;
  lastRunAt: string | null;
  online: boolean;
  storage: { usage: number; quota: number; persisted: boolean } | null;

  start: (userId: string) => void;
  stop: () => void;
  refresh: () => Promise<void>;
  kick: () => Promise<void>;
  retry: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Called by the recorder so the list updates while it writes. */
  upsertLocal: (recording: LocalRecording) => void;
}

const POLL_MS = 30_000;
let teardown: (() => void) | null = null;
let activeRecordingId: string | undefined;

export function setActiveRecordingId(id: string | undefined) {
  activeRecordingId = id;
}

async function readStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const [{ usage = 0, quota = 0 }, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false),
    ]);
    return { usage, quota, persisted };
  } catch {
    return null;
  }
}

export const useFieldOutbox = create<OutboxState>()((set, get) => ({
  available: false,
  userId: null,
  recordings: [],
  running: false,
  lastResult: null,
  lastRunAt: null,
  online: true,
  storage: null,

  start: (userId) => {
    if (typeof window === 'undefined') return;
    if (!isIndexedDbAvailable()) {
      set({ available: false });
      return;
    }
    if (get().userId === userId && teardown) return;
    teardown?.();

    set({ available: true, userId, online: navigator.onLine });

    const onOnline = () => {
      set({ online: true });
      void get().kick();
    };
    const onOffline = () => set({ online: false });
    const onVisible = () => {
      if (document.visibilityState === 'visible') void get().kick();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void get().kick(), POLL_MS);

    teardown = () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      teardown = null;
    };

    void (async () => {
      await recoverInterrupted(idbRecordingRepo, activeRecordingId).catch(() => 0);
      await get().refresh();
      await get().kick();
    })();
  },

  stop: () => {
    teardown?.();
    set({ userId: null, recordings: [] });
  },

  refresh: async () => {
    const { userId } = get();
    if (!userId || !get().available) return;
    const all = await idbRecordingRepo.list().catch(() => [] as LocalRecording[]);
    set({
      recordings: all
        .filter((r) => r.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      storage: await readStorage(),
    });
  },

  kick: async () => {
    const { userId, running, available } = get();
    if (!userId || running || !available) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ online: false, lastResult: 'offline' });
      return;
    }
    set({ running: true });
    try {
      const result = await runOutbox({
        repo: idbRecordingRepo,
        transport: apiUploadTransport,
        userId,
        onChange: (recording) => get().upsertLocal(recording),
      });
      set({ lastResult: result, lastRunAt: new Date().toISOString() });
    } finally {
      set({ running: false });
      await get().refresh();
    }
  },

  retry: async (id) => {
    const recording = await idbRecordingRepo.get(id);
    if (!recording) return;
    await idbRecordingRepo.put({
      ...recording,
      status: 'queued',
      nextAttemptAt: undefined,
      lastError: undefined,
      updatedAt: new Date().toISOString(),
    });
    await get().refresh();
    await get().kick();
  },

  remove: async (id) => {
    await idbRecordingRepo.delete(id);
    await get().refresh();
  },

  upsertLocal: (recording) => {
    set((state) => {
      const others = state.recordings.filter((r) => r.id !== recording.id);
      return {
        recordings: [recording, ...others].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    });
  },
}));

/** Counts the UI uses for badges and the sync pill. */
export function summarizeOutbox(recordings: LocalRecording[]) {
  const pending = recordings.filter((r) => r.status !== 'uploaded');
  return {
    pending: pending.length,
    uploading: recordings.filter((r) => r.status === 'uploading').length,
    blocked: recordings.filter((r) => r.status === 'blocked').length,
    failed: recordings.filter((r) => r.status === 'failed').length,
    pendingBytes: pending.reduce((sum, r) => sum + r.size, 0),
  };
}
