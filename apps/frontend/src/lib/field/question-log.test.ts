import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('./idb', () => ({
  isIndexedDbAvailable: () => true,
  idbQuestionLog: {
    get: async (id: string) => store.get(id),
    list: async () => [...store.values()],
    put: async (r: { interviewId: string }) => void store.set(r.interviewId, r),
  },
}));
const save = vi.fn();
vi.mock('@/lib/api-client', () => ({ API: { interviews: { saveQuestionLog: (...a: unknown[]) => save(...a) } } }));

import { markQuestion, syncAllQuestionLogs, syncQuestionLog } from './question-log';

function setOnline(v: boolean) {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: v }, configurable: true });
}

describe('question log (offline-first)', () => {
  beforeEach(() => {
    store.clear();
    save.mockReset();
  });

  it('keeps marks made offline and sends them once back online', async () => {
    setOnline(false);
    await markQuestion('iv1', { questionId: 'q1', status: 'ASKED', atMs: 1200, markedAt: '2026-09-24T10:00:00Z' });
    // A second attempt while still offline must not wedge later sends.
    expect(await syncQuestionLog('iv1')).toBe(false);
    expect(save).not.toHaveBeenCalled();

    setOnline(true);
    save.mockResolvedValue({});
    await syncAllQuestionLogs();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1]).toEqual([expect.objectContaining({ questionId: 'q1', atMs: 1200 })]);
    expect((store.get('iv1') as { synced: boolean }).synced).toBe(true);
  });

  it('keeps marks unsent when the server refuses (e.g. interview not created yet), and retries', async () => {
    setOnline(true);
    save.mockRejectedValueOnce(new Error('404'));
    await markQuestion('iv2', { questionId: 'q1', status: 'SKIPPED', markedAt: '2026-09-24T10:00:00Z' });
    await new Promise((r) => setTimeout(r, 0));
    expect((store.get('iv2') as { synced: boolean }).synced).toBe(false);
    save.mockResolvedValue({});
    expect(await syncQuestionLog('iv2')).toBe(true);
    expect((store.get('iv2') as { synced: boolean }).synced).toBe(true);
  });

  it('replaces an earlier mark for the same question', async () => {
    setOnline(false);
    await markQuestion('iv3', { questionId: 'q1', status: 'ASKED', markedAt: '2026-09-24T10:00:00Z' });
    const marks = await markQuestion('iv3', { questionId: 'q1', status: 'CLEAR', markedAt: '2026-09-24T10:01:00Z' });
    expect(marks).toEqual([expect.objectContaining({ status: 'CLEAR' })]);
  });
});
