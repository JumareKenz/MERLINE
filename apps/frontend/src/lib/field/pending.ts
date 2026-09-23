import type { PendingInterviewRepo } from './idb';
import type { PendingInterview, PendingInterviewTransport } from './types';
import { UploadError } from './types';

export type PendingSyncResult = 'idle' | 'offline' | 'unauthorized';

/**
 * Creates on the server every interview this user started on site, oldest
 * first. The call is idempotent (device-generated ids), so a retry after a
 * lost response is harmless. Synced rows are kept (status "synced") until
 * their recordings have uploaded, so the interview screen can still find
 * them offline; `prunePending` removes them afterwards.
 */
export async function syncPendingInterviews(
  repo: PendingInterviewRepo,
  transport: PendingInterviewTransport,
  userId: string,
  onChange?: (p: PendingInterview) => void,
): Promise<PendingSyncResult> {
  const due = (await repo.list())
    .filter((p) => p.userId === userId && p.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const item of due) {
    try {
      await transport.create(item);
      const synced: PendingInterview = { ...item, status: 'synced', lastError: undefined };
      await repo.put(synced);
      onChange?.(synced);
    } catch (err) {
      const e = err instanceof UploadError ? err : new UploadError('Could not reach the server', 0);
      if (e.status === 0) return 'offline';
      if (e.status === 401) return 'unauthorized';
      // 403 (not assigned), 404 (project gone), 409 (bad device clock...):
      // retrying the same request cannot succeed; surface it.
      const retryable = e.status >= 500 || e.status === 429;
      const updated: PendingInterview = {
        ...item,
        attempts: item.attempts + 1,
        lastError: e.message,
        status: retryable ? 'pending' : 'blocked',
      };
      await repo.put(updated);
      onChange?.(updated);
      if (retryable) return 'offline';
    }
  }
  return 'idle';
}

/** Forget synced on-site interviews once none of their recordings remain on the device. */
export async function prunePending(repo: PendingInterviewRepo, stillNeeded: Set<string>) {
  for (const p of await repo.list()) {
    if (p.status === 'synced' && !stillNeeded.has(p.id)) await repo.delete(p.id);
  }
}
