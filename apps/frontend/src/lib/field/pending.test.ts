import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { idbPendingRepo } from './idb';
import { prunePending, syncPendingInterviews } from './pending';
import { UploadError, type PendingInterview } from './types';

const USER = 'user-1';
let n = 0;

function pending(overrides: Partial<PendingInterview> = {}): PendingInterview {
  n++;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    participantId: `p-${n}`,
    consentId: `c-${n}`,
    userId: USER,
    projectId: 'project-1',
    participant: { displayName: `P-${n}` },
    consent: {
      version: 'v1',
      method: 'VERBAL',
      allowRecording: true,
      allowTranscription: true,
      allowAiAnalysis: false,
      allowQuotation: true,
      allowPublication: false,
      capturedAt: new Date().toISOString(),
    },
    createdAt: new Date(2026, 0, 1, 0, 0, n).toISOString(),
    status: 'pending',
    attempts: 0,
    ...overrides,
  };
}

beforeEach(async () => {
  for (const p of await idbPendingRepo.list()) await idbPendingRepo.delete(p.id);
});

describe('syncPendingInterviews', () => {
  it('creates interviews started on site, oldest first, and marks them synced', async () => {
    const a = pending();
    const b = pending();
    await idbPendingRepo.put(b);
    await idbPendingRepo.put(a);
    const order: string[] = [];
    const transport = { create: vi.fn(async (p: PendingInterview) => void order.push(p.id)) };

    expect(await syncPendingInterviews(idbPendingRepo, transport, USER)).toBe('idle');
    expect(order).toEqual([a.id, b.id]);
    expect((await idbPendingRepo.get(a.id))!.status).toBe('synced');
  });

  it('stops when offline and keeps the interview pending', async () => {
    const a = pending();
    await idbPendingRepo.put(a);
    const transport = { create: vi.fn(async () => { throw new UploadError('Network error', 0); }) };
    expect(await syncPendingInterviews(idbPendingRepo, transport, USER)).toBe('offline');
    expect((await idbPendingRepo.get(a.id))!.status).toBe('pending');
  });

  it('blocks, without retrying, when the server refuses (e.g. not assigned to the project)', async () => {
    const a = pending();
    await idbPendingRepo.put(a);
    const transport = {
      create: vi.fn(async () => {
        throw new UploadError('You are not assigned to this project.', 403);
      }),
    };
    await syncPendingInterviews(idbPendingRepo, transport, USER);
    const after = (await idbPendingRepo.get(a.id))!;
    expect(after.status).toBe('blocked');
    expect(after.lastError).toMatch(/not assigned/);
    await syncPendingInterviews(idbPendingRepo, transport, USER);
    expect(transport.create).toHaveBeenCalledTimes(1);
  });

  it("ignores another user's interviews", async () => {
    await idbPendingRepo.put(pending({ userId: 'someone-else' }));
    const transport = { create: vi.fn(async () => undefined) };
    await syncPendingInterviews(idbPendingRepo, transport, USER);
    expect(transport.create).not.toHaveBeenCalled();
  });

  it('prunes synced interviews once their audio has uploaded', async () => {
    const withAudio = pending({ status: 'synced' });
    const done = pending({ status: 'synced' });
    const notYet = pending({ status: 'pending' });
    for (const p of [withAudio, done, notYet]) await idbPendingRepo.put(p);
    await prunePending(idbPendingRepo, new Set([withAudio.id]));
    const ids = (await idbPendingRepo.list()).map((p) => p.id).sort();
    expect(ids).toEqual([withAudio.id, notYet.id].sort());
  });
});
