/**
 * How a job handler tells the runner what to do with a failure.
 *
 *  - RetryableJobError: transient (rate limit, timeout, provider 5xx). The
 *    job is rescheduled with backoff, honouring `retryAfterMs` when the
 *    provider said how long to wait.
 *  - PermanentJobError: retrying cannot help (consent withdrawn, file
 *    unreadable, key rejected). The job fails immediately and stays visible
 *    until someone retries it by hand.
 *
 * Any other error is treated as retryable: an unexpected failure should not
 * be silently dropped, and backoff bounds the cost of retrying a real bug.
 */
export class RetryableJobError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'RetryableJobError';
  }
}

export class PermanentJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentJobError';
  }
}

const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 30 * 60_000;

/**
 * Exponential backoff: 30s, 60s, 2m, 4m… capped at 30 minutes, and never
 * sooner than the provider's own retry-after.
 */
export function backoffDelayMs(attempt: number, retryAfterMs?: number): number {
  const exponential = Math.min(
    BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1),
    MAX_DELAY_MS,
  );
  return Math.max(exponential, retryAfterMs ?? 0);
}
