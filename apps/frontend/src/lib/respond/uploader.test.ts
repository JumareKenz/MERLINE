import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RespondError, respondApi } from './api';
import { PART_BYTES, StreamUploader, type UploadProgress } from './uploader';

vi.mock('./api', async (orig) => {
  const actual = await orig<typeof import('./api')>();
  return { ...actual, respondApi: { putPart: vi.fn(), complete: vi.fn() } };
});

const putPart = vi.mocked(respondApi.putPart);
const complete = vi.mocked(respondApi.complete);

/** Bytes whose value encodes their position, to check reassembly. */
function bytes(from: number, n: number) {
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = (from + i) % 251;
  return new Blob([a]);
}

function make(extra: Partial<ConstructorParameters<typeof StreamUploader>[0]> = {}) {
  const progress: UploadProgress[] = [];
  const u = new StreamUploader({
    token: 't',
    sessionId: 's',
    secret: 'k',
    uploadId: 'u',
    mimeType: 'audio/webm;codecs=opus',
    onProgress: (p) => progress.push(p),
    backoffMs: () => 0,
    ...extra,
  });
  return { u, progress };
}

describe('StreamUploader', () => {
  const received = new Map<number, Uint8Array>();
  beforeEach(() => {
    received.clear();
    putPart.mockReset();
    complete.mockReset();
    putPart.mockImplementation(async (_t, _s, _k, _u, index, chunk) => {
      received.set(index, new Uint8Array(await chunk.arrayBuffer()));
      return { index };
    });
    complete.mockResolvedValue({ id: 'media' });
  });

  it('sends full parts while recording and the short tail only when sealed', async () => {
    const { u } = make();
    // Slices that do not line up with part boundaries.
    const total = PART_BYTES * 2 + 1000;
    let at = 0;
    for (const n of [300_000, 400_000, 300_000]) {
      u.append(bytes(at, n));
      at += n;
    }
    await vi.waitFor(() => expect(received.size).toBe(1));
    u.append(bytes(at, total - at));
    await vi.waitFor(() => expect(received.size).toBe(2));
    expect(putPart).toHaveBeenCalledTimes(2); // tail not sent yet

    await u.finish(12_345);
    expect(received.size).toBe(3);
    const joined = new Uint8Array(total);
    let off = 0;
    for (let i = 0; i < 3; i++) {
      joined.set(received.get(i)!, off);
      off += received.get(i)!.length;
    }
    expect(off).toBe(total);
    expect([...joined.slice(0, 5)]).toEqual([0, 1, 2, 3, 4]);
    expect(joined[PART_BYTES]).toBe(PART_BYTES % 251);
    expect(complete).toHaveBeenCalledWith('t', 's', 'k', 'u', { totalParts: 3, mimeType: 'audio/webm;codecs=opus', durationMs: 12345 });
  });

  it('retries a part through a lost connection and reports waiting', async () => {
    let fails = 2;
    putPart.mockImplementation(async (_t, _s, _k, _u, index) => {
      if (fails-- > 0) throw new RespondError('No connection to the server.', 0);
      return { index };
    });
    const { u, progress } = make();
    u.append(bytes(0, 1000));
    await u.finish(1000);
    expect(putPart).toHaveBeenCalledTimes(3);
    expect(progress.some((p) => p.phase === 'waiting')).toBe(true);
    expect(progress.at(-1)?.phase).toBe('done');
  });

  it('stops for good on a refusal (e.g. consent withdrawn)', async () => {
    putPart.mockRejectedValue(new RespondError('Consent was withdrawn', 403));
    const { u, progress } = make();
    u.append(bytes(0, 1000));
    await expect(u.finish(1000)).rejects.toThrow(/withdrawn/);
    expect(putPart).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
    expect(progress.at(-1)).toMatchObject({ phase: 'error', message: 'Consent was withdrawn' });
  });

  it('skips parts the server already has after a reload', async () => {
    const parts: number[][] = [];
    const { u } = make({ uploadedParts: [0], onPartsChange: (p) => parts.push(p) });
    u.append(bytes(0, PART_BYTES + 10));
    await u.finish(5000);
    expect(putPart.mock.calls.map((c) => c[4])).toEqual([1]);
    expect(parts.at(-1)).toEqual([0, 1]);
    expect(complete.mock.calls[0][4]).toMatchObject({ totalParts: 2 });
  });

  it('refuses to complete an empty recording', async () => {
    const { u } = make();
    await expect(u.finish(0)).rejects.toThrow(/No audio/);
    expect(complete).not.toHaveBeenCalled();
  });
});
