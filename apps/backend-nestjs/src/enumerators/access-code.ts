import { createHmac, randomInt } from 'crypto';

/**
 * Field-app access codes for individual enumerators.
 *
 * A code is 10 characters from a 31-character alphabet with no look-alikes
 * (no 0/O, 1/I/L), drawn with crypto.randomInt: about 49 bits, shown as
 * XXXXX-XXXXX. Nothing about a code is derived from the enumerator, the
 * time or a counter, so knowing one code tells you nothing about another.
 *
 * Only an HMAC-SHA256 of the normalised code, keyed with a server secret,
 * is stored. The lookup at sign-in is by that hash (a plain unique-index
 * read, no per-row comparison), and a copy of the database alone cannot be
 * used to recover or brute-force codes without the key.
 */
export const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ACCESS_CODE_LENGTH = 10;

export function generateAccessCode(): string {
  return Array.from(
    { length: ACCESS_CODE_LENGTH },
    () => ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)],
  ).join('');
}

/** Groups a normalised code for display: ABCDE-FGHJK. */
export function formatAccessCode(normalized: string): string {
  return normalized.length === ACCESS_CODE_LENGTH
    ? `${normalized.slice(0, 5)}-${normalized.slice(5)}`
    : normalized;
}

/** Case, spaces and dashes are ignored, so typing on a phone is forgiving. */
export function normalizeAccessCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function pepper(): string {
  const key = process.env.ACCESS_CODE_PEPPER || process.env.JWT_SECRET;
  if (!key) {
    // Fail closed: hashing with an empty key would be a silent downgrade.
    throw new Error('ACCESS_CODE_PEPPER or JWT_SECRET must be set');
  }
  return key;
}

export function hashAccessCode(normalized: string): string {
  return createHmac('sha256', pepper())
    .update(`merline-field-access-code:${normalized}`)
    .digest('hex');
}

export type AccessCodeState = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'UNUSED' | 'NONE';

/**
 * What an administrator sees for one enumerator: no code at all, a code
 * never used yet, in use, expired or revoked. `UNUSED` is an active code
 * that no one has signed in with.
 */
export function accessCodeState(
  code:
    | {
        status: 'ACTIVE' | 'REVOKED';
        expiresAt: Date | null;
        lastUsedAt: Date | null;
      }
    | null
    | undefined,
  now = new Date(),
): AccessCodeState {
  if (!code) return 'NONE';
  if (code.status === 'REVOKED') return 'REVOKED';
  if (code.expiresAt && code.expiresAt <= now) return 'EXPIRED';
  return code.lastUsedAt ? 'ACTIVE' : 'UNUSED';
}
