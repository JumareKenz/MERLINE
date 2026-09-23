import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PART_SIZE, backoffMs, recoverInterrupted, runOutbox, sha256Hex } from './outbox';
import { idbRecordingRepo } from './idb';
import { UploadError, type LocalRecording, type UploadTransport } from './types';

const USER = 'user-1';
let seq = 0;

function recording(overrides: Partial<LocalRecording> = {}): LocalRecording {
  seq++;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    userId: USER,
    interviewId: 'interview-1',
    mimeType: 'audio/webm;codecs=opus',
    source: 'recorder',
    originalName: 'interview.webm',
    createdAt: new Date(2026, 0, 1, 0, 0, seq).toISOString(),
    updatedAt: new Date().toISOString(),
    durationMs: 60_000,
    size: 0,
    sliceCount: 0,
    status: 'queued',
    uploadedParts: [],
    attempts: 0,
    ...overrides,
  };
}

async function withAudio(rec: LocalRecording, bytes: number): Promise<LocalRecording> {
  await idbRecordingRepo.put(rec);
  const half = Math.floor(bytes / 2);
  await idbRecordingRepo.appendSlice(rec.id, 0, new Blob([new Uint8Array(half).fill(1)]));
  await idbRecordingRepo.appendSlice(rec.id, 1, new Blob([new Uint8Array(bytes - half).fill(2)]));
  return (await idbRecordingRepo.get(rec.id)) as LocalRecording;
}

/** A server that behaves like the real resumable endpoints. */
function fakeServer() {
  const parts = new Map<string, Map<number, Blob>>();
  const completed = new Map<string, { id: string; bytes: Blob }>();
  const transport: UploadTransport = {
    status: vi.fn(async (_i: string, uploadId: string) => ({
      receivedParts: [...(parts.get(uploadId)?.keys() ?? [])],
      completed: completed.get(uploadId) ? { id: completed.get(uploadId)!.id } : null,
    })),
    putPart: vi.fn(async (_i: string, uploadId: string, index: number, part: Blob) => {
      if (!parts.has(uploadId)) parts.set(uploadId, new Map());
      parts.get(uploadId)!.set(index, part);
    }),
    complete: vi.fn(async (_i: string, uploadId: string, body) => {
      const existing = completed.get(uploadId);
      if (existing) return { id: existing.id };
      const got = parts.get(uploadId)!;
      const ordered = [...got.keys()].sort((a, b) => a - b).map((k) => got.get(k)!);
      const bytes = new Blob(ordered);
      if (body.checksum && body.checksum !== (await sha256Hex(bytes))) {
        parts.delete(uploadId);
        throw new UploadError('Recording checksum mismatch', 400);
      }
      const media = { id: `media-${uploadId}`, bytes };
      completed.set(uploadId, media);
      return { id: media.id };
    }),
  };
  return { transport, parts, completed };
}

beforeEach(async () => {
  for (const r of await idbRecordingRepo.list()) await idbRecordingRepo.delete(r.id);
});

describe('runOutbox', () => {
  it('uploads in small parts, verifies, and frees device storage', async () => {
    const rec = await withAudio(recording(), PART_SIZE * 2 + 100);
    const server = fakeServer();

    expect(await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER })).toBe('idle');

    const after = (await idbRecordingRepo.get(rec.id))!;
    expect(after.status).toBe('uploaded');
    expect(after.mediaId).toBe(`media-${rec.id}`);
    expect(after.totalParts).toBe(3);
    expect(server.transport.putPart).toHaveBeenCalledTimes(3);
    const sizes = vi.mocked(server.transport.putPart).mock.calls.map((c) => c[3].size);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(PART_SIZE);
    expect((await idbRecordingRepo.readAudio(rec.id, rec.mimeType)).size).toBe(0);
    expect(server.completed.get(rec.id)!.bytes.size).toBe(PART_SIZE * 2 + 100);
  });

  it('resumes after a dropped connection without re-sending finished parts', async () => {
    const rec = await withAudio(recording(), PART_SIZE * 3);
    const server = fakeServer();
    const realPut = server.transport.putPart;
    let calls = 0;
    server.transport.putPart = vi.fn(async (...args: Parameters<UploadTransport['putPart']>) => {
      calls++;
      if (calls === 2) throw new UploadError('Network error', 0);
      return realPut(...args);
    });

    expect(await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER })).toBe('offline');
    const paused = (await idbRecordingRepo.get(rec.id))!;
    expect(paused.status).toBe('failed');
    expect(paused.uploadedParts).toEqual([0]);
    expect(paused.attempts).toBe(0); // being offline is not a failed attempt

    server.transport.putPart = realPut;
    expect(await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER })).toBe('idle');
    // Parts 1 and 2 only; part 0 was already on the server.
    expect(vi.mocked(realPut).mock.calls.map((c) => c[2])).toEqual([0, 1, 2]);
    expect((await idbRecordingRepo.get(rec.id))!.status).toBe('uploaded');
  });

  it('recognises a completion whose response was lost', async () => {
    const rec = await withAudio(recording(), 1000);
    const server = fakeServer();
    server.completed.set(rec.id, { id: 'media-earlier', bytes: new Blob() });

    await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER });

    expect(server.transport.putPart).not.toHaveBeenCalled();
    expect((await idbRecordingRepo.get(rec.id))!.mediaId).toBe('media-earlier');
  });

  it('blocks, without retrying, when consent does not permit recording', async () => {
    const rec = await withAudio(recording(), 1000);
    const server = fakeServer();
    server.transport.status = vi.fn(async () => {
      throw new UploadError('Consent does not permit recording for this participant', 403);
    });

    expect(await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER })).toBe('idle');
    const after = (await idbRecordingRepo.get(rec.id))!;
    expect(after.status).toBe('blocked');
    expect(after.lastError).toMatch(/consent/i);
    // The audio is kept for the interviewer to decide about, not deleted.
    expect((await idbRecordingRepo.readAudio(rec.id, rec.mimeType)).size).toBe(1000);

    await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER });
    expect(server.transport.status).toHaveBeenCalledTimes(1);
  });

  it('pauses on an expired session and keeps the recording queued', async () => {
    const rec = await withAudio(recording(), 1000);
    const server = fakeServer();
    server.transport.status = vi.fn(async () => {
      throw new UploadError('Unauthorized', 401);
    });
    expect(await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER })).toBe(
      'unauthorized',
    );
    expect((await idbRecordingRepo.get(rec.id))!.status).toBe('queued');
  });

  it('backs off after a server error and skips the recording until it is due', async () => {
    const rec = await withAudio(recording(), 1000);
    const server = fakeServer();
    server.transport.status = vi.fn(async () => {
      throw new UploadError('Internal server error', 500);
    });
    const t0 = Date.parse('2026-01-01T00:00:00Z');

    await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER, now: () => t0 });
    const failed = (await idbRecordingRepo.get(rec.id))!;
    expect(failed.status).toBe('failed');
    expect(Date.parse(failed.nextAttemptAt!)).toBe(t0 + backoffMs(1));

    await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER, now: () => t0 + 1000 });
    expect(server.transport.status).toHaveBeenCalledTimes(1);

    await runOutbox({
      repo: idbRecordingRepo,
      transport: server.transport,
      userId: USER,
      now: () => t0 + backoffMs(1),
    });
    expect(server.transport.status).toHaveBeenCalledTimes(2);
  });

  it("never uploads another user's recording", async () => {
    const rec = await withAudio(recording({ userId: 'someone-else' }), 1000);
    const server = fakeServer();
    await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER });
    expect(server.transport.status).not.toHaveBeenCalled();
    expect((await idbRecordingRepo.get(rec.id))!.status).toBe('queued');
  });

  it('restarts from part 0 after a checksum mismatch', async () => {
    const rec = await withAudio(recording(), 1000);
    await idbRecordingRepo.put({ ...(await idbRecordingRepo.get(rec.id))!, checksum: 'f'.repeat(64), totalParts: 1 });
    const server = fakeServer();

    await runOutbox({ repo: idbRecordingRepo, transport: server.transport, userId: USER });
    const after = (await idbRecordingRepo.get(rec.id))!;
    expect(after.status).toBe('failed');
    expect(after.uploadedParts).toEqual([]);
  });

  it('backoff grows and is capped', () => {
    expect(backoffMs(1)).toBe(5_000);
    expect(backoffMs(2)).toBe(10_000);
    expect(backoffMs(20)).toBe(5 * 60_000);
  });
});

describe('recoverInterrupted', () => {
  it('queues audio left mid-recording and fails an empty one', async () => {
    const withSound = await withAudio(recording({ status: 'recording' }), 500);
    const empty = recording({ status: 'recording' });
    await idbRecordingRepo.put(empty);
    const active = await withAudio(recording({ status: 'recording' }), 500);

    expect(await recoverInterrupted(idbRecordingRepo, active.id)).toBe(2);
    expect((await idbRecordingRepo.get(withSound.id))!).toMatchObject({ status: 'queued', recovered: true });
    expect((await idbRecordingRepo.get(empty.id))!.status).toBe('failed');
    expect((await idbRecordingRepo.get(active.id))!.status).toBe('recording');
  });
});

describe('idbRecordingRepo', () => {
  it('keeps slice order and row size in step', async () => {
    const rec = recording();
    await idbRecordingRepo.put(rec);
    await idbRecordingRepo.appendSlice(rec.id, 1, new Blob(['world']));
    await idbRecordingRepo.appendSlice(rec.id, 0, new Blob(['hello ']));
    const row = (await idbRecordingRepo.get(rec.id))!;
    expect(row.size).toBe(11);
    expect(row.sliceCount).toBe(2);
    expect(await (await idbRecordingRepo.readAudio(rec.id, 'text/plain')).text()).toBe('hello world');

    await idbRecordingRepo.delete(rec.id);
    expect(await idbRecordingRepo.get(rec.id)).toBeUndefined();
    expect((await idbRecordingRepo.readAudio(rec.id, 'text/plain')).size).toBe(0);
  });
});
