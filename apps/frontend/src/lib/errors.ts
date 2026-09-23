import type { ApiError } from '@/types/api';

/**
 * Human wording for a failed request. The API client rejects with plain
 * ApiError objects, not Error instances — so `err instanceof Error` checks
 * silently discarded every real message (including "you're offline").
 */
export function describeError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as Partial<ApiError> | undefined;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return "You're offline. Connect to the internet and try again.";
  if (e?.status === 0) return "Couldn't reach Merline. Check your connection and try again.";
  if (e?.status === 429) return 'Too many attempts. Wait a minute, then try again.';
  if (e?.status && e.status >= 500) return 'Merline is having trouble right now. Please try again shortly.';
  const message = Array.isArray(e?.message) ? e?.message.join(' ') : e?.message;
  return message || fallback;
}
