/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Regression tests for the two defects that made the API impossible to
 * authenticate against. Both are reproduced against the real `jsonwebtoken`
 * library rather than asserted on our own helpers alone, because the original
 * bugs were in how those helpers' output was consumed.
 */
import * as jwt from 'jsonwebtoken';
import {
  DEFAULT_JWT_EXPIRES_IN,
  expiresInSeconds,
  JWT_AUDIENCE,
  JWT_ISSUER,
  jwtSignOptions,
  jwtVerifyOptions,
  resolveExpiresIn,
} from './jwt.constants';

const SECRET = 'test-secret-not-a-real-key';

describe('jwt.constants', () => {
  describe('resolveExpiresIn', () => {
    it('passes a duration string through instead of parseInt-ing it', () => {
      // The original bug: parseInt('7d', 10) === 7, i.e. a 7-second token.
      expect(resolveExpiresIn('7d')).toBe('7d');
      expect(resolveExpiresIn('12h')).toBe('12h');
      expect(resolveExpiresIn('30m')).toBe('30m');
    });

    it('converts a bare seconds count to a number', () => {
      expect(resolveExpiresIn('604800')).toBe(604800);
      expect(resolveExpiresIn(3600)).toBe(3600);
    });

    it('falls back to the default when unset', () => {
      expect(resolveExpiresIn(undefined)).toBe(DEFAULT_JWT_EXPIRES_IN);
      expect(resolveExpiresIn('')).toBe(DEFAULT_JWT_EXPIRES_IN);
    });

    it('rejects an unparseable value rather than silently truncating it', () => {
      expect(() => resolveExpiresIn('7 fortnights')).toThrow(/Invalid JWT_EXPIRES_IN/);
    });
  });

  describe('expiresInSeconds', () => {
    it('reports the same lifetime the token actually carries', () => {
      expect(expiresInSeconds('7d')).toBe(604800);
      expect(expiresInSeconds('12h')).toBe(43200);
      expect(expiresInSeconds('604800')).toBe(604800);
    });
  });

  describe('sign/verify round trip', () => {
    const payload = { sub: 'user-1', email: 'user@example.test', orgId: 'org-1', tkn: 0 };

    it('produces a token that verifies with the verification options', () => {
      // The original bug: signed without issuer/audience, verified with them,
      // so every authenticated request failed with "jwt audience invalid".
      const token = jwt.sign(payload, SECRET, jwtSignOptions('7d'));

      expect(() =>
        jwt.verify(token, SECRET, jwtVerifyOptions),
      ).not.toThrow();
    });

    it('embeds the issuer and audience the verifier requires', () => {
      const token = jwt.sign(payload, SECRET, jwtSignOptions('7d'));
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded.iss).toBe(JWT_ISSUER);
      expect(decoded.aud).toBe(JWT_AUDIENCE);
    });

    it('issues a token that lasts the configured duration, not 7 seconds', () => {
      const token = jwt.sign(payload, SECRET, jwtSignOptions('7d'));
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      const lifetime = (decoded.exp as number) - (decoded.iat as number);
      expect(lifetime).toBe(604800);
      expect(lifetime).not.toBe(7);
    });

    it('defaults to a usable lifetime when no configuration is present', () => {
      const token = jwt.sign(payload, SECRET, jwtSignOptions(undefined));
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      const lifetime = (decoded.exp as number) - (decoded.iat as number);
      expect(lifetime).toBeGreaterThan(60);
    });

    it('still rejects a token signed without the expected claims', () => {
      // Guards against someone reintroducing a bare sign() call.
      const bare = jwt.sign(payload, SECRET, { expiresIn: '7d' });

      expect(() =>
        jwt.verify(bare, SECRET, jwtVerifyOptions),
      ).toThrow();
    });

    it('rejects a token signed with a different secret', () => {
      const token = jwt.sign(payload, 'another-secret', jwtSignOptions('7d'));

      expect(() =>
        jwt.verify(token, SECRET, jwtVerifyOptions),
      ).toThrow();
    });
  });
});
