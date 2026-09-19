/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Single source of truth for JWT signing and verification parameters.
 *
 * Two defects made the API impossible to authenticate against, and both came
 * from these values being defined twice, independently:
 *
 *   1. `JwtModule.registerAsync` signed tokens with no `issuer`/`audience`,
 *      while `JwtStrategy` verified WITH them. Every token was rejected with
 *      "jwt audience invalid".
 *
 *   2. `parseInt(configService.get('jwt.expiresIn', '604800'), 10)` was applied
 *      to the configuration default, which is the STRING '7d'.
 *      `parseInt('7d', 10)` is `7`, which jsonwebtoken reads as 7 SECONDS.
 *
 * Signing and verification must both import from this file.
 */

export const JWT_ISSUER = 'merline';
export const JWT_AUDIENCE = 'merline-api';
export const JWT_ALGORITHM = 'HS256' as const;

/** Used when neither JWT_EXPIRES_IN nor a config value is supplied. */
export const DEFAULT_JWT_EXPIRES_IN = '7d';

const DURATION_PATTERN = /^(\d+)\s*([smhd])$/i;

const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

/**
 * Value to hand to jsonwebtoken's `expiresIn`.
 *
 * Returns a number when the input is a bare seconds count, and the original
 * duration string (e.g. '7d') otherwise. Deliberately does NOT call parseInt
 * on a duration string — that is the bug this module exists to prevent.
 */
/**
 * What jsonwebtoken accepts for `expiresIn`: a seconds count, or a duration
 * string. Typed as a template literal union so it satisfies the library's
 * `StringValue` type — a plain `string` is deliberately too wide there, and
 * that narrowness is what stops `'7d'` being passed somewhere expecting
 * seconds.
 */
export type ExpiresIn =
  | number
  | `${number}s`
  | `${number}m`
  | `${number}h`
  | `${number}d`;

export function resolveExpiresIn(raw?: string | number): ExpiresIn {
  if (typeof raw === 'number') return raw;
  if (!raw) return DEFAULT_JWT_EXPIRES_IN;

  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  // Validated by the pattern immediately above, so the assertion is safe;
  // TypeScript cannot narrow a runtime-checked `string` to a literal union.
  if (DURATION_PATTERN.test(trimmed)) return trimmed as ExpiresIn;

  throw new Error(
    `Invalid JWT_EXPIRES_IN value: "${raw}". Use seconds (e.g. 604800) or a duration (e.g. 7d, 12h, 30m).`,
  );
}

/**
 * The same lifetime expressed in seconds, for the `expiresIn` field returned
 * to clients. Kept separate so the API response can never disagree with the
 * token it describes.
 */
export function expiresInSeconds(raw?: string | number): number {
  const resolved = resolveExpiresIn(raw);
  if (typeof resolved === 'number') return resolved;

  const match = DURATION_PATTERN.exec(resolved);
  if (!match) {
    throw new Error(`Cannot convert "${resolved}" to seconds.`);
  }

  return Number(match[1]) * UNIT_SECONDS[match[2].toLowerCase()];
}

/** Options applied when signing. Must mirror `jwtVerifyOptions`. */
export function jwtSignOptions(rawExpiresIn?: string | number) {
  return {
    expiresIn: resolveExpiresIn(rawExpiresIn),
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
}

/** Options applied when verifying. Must mirror `jwtSignOptions`. */
export const jwtVerifyOptions = {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  // Not `as const`: both passport-jwt and jsonwebtoken want a mutable
  // Algorithm[], and a readonly tuple is not assignable to it.
  algorithms: [JWT_ALGORITHM],
};
