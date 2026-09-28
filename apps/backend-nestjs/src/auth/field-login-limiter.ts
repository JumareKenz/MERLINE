import { Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 8;
const FIRST_BLOCK_MS = 15 * 60_000;
const MAX_BLOCK_MS = 24 * 3600_000;
/** Blocks within this long of the last one count as a repeat. */
const REPEAT_MEMORY_MS = 24 * 3600_000;

interface Entry {
  failures: number[];
  blockedUntil: number;
  blocks: number;
  lastBlockAt: number;
}

/**
 * Brute-force protection for access-code sign-in. Codes are only 4
 * characters, so what keeps them safe is how few guesses anyone gets:
 * 8 wrong codes from one address within 15 minutes blocks that address,
 * and each repeat block doubles (15 min, 30 min, 1 h … up to 24 h). A
 * correct code clears the address's failures.
 *
 * In memory: the API is one process. A restart forgets blocks, which is
 * acceptable; the per-route throttle still applies.
 */
@Injectable()
export class FieldLoginLimiter {
  private readonly entries = new Map<string, Entry>();
  /** The clock; tests replace it. */
  now: () => number = () => Date.now();

  /** Milliseconds until this address may try again, or 0. */
  retryAfterMs(ip: string): number {
    const e = this.entries.get(ip);
    if (!e) return 0;
    return Math.max(0, e.blockedUntil - this.now());
  }

  recordFailure(ip: string): void {
    const now = this.now();
    const e = this.entries.get(ip) ?? {
      failures: [],
      blockedUntil: 0,
      blocks: 0,
      lastBlockAt: 0,
    };
    e.failures = e.failures.filter((t) => now - t < WINDOW_MS);
    e.failures.push(now);
    if (e.failures.length >= MAX_FAILURES) {
      if (now - e.lastBlockAt > REPEAT_MEMORY_MS) e.blocks = 0;
      e.blockedUntil =
        now + Math.min(MAX_BLOCK_MS, FIRST_BLOCK_MS * 2 ** e.blocks);
      e.blocks++;
      e.lastBlockAt = now;
      e.failures = [];
    }
    this.entries.set(ip, e);
    this.prune(now);
  }

  recordSuccess(ip: string): void {
    const e = this.entries.get(ip);
    if (e) e.failures = [];
  }

  private prune(now: number) {
    if (this.entries.size < 10_000) return;
    for (const [ip, e] of this.entries) {
      if (e.blockedUntil < now && now - e.lastBlockAt > REPEAT_MEMORY_MS && e.failures.length === 0)
        this.entries.delete(ip);
    }
  }
}
