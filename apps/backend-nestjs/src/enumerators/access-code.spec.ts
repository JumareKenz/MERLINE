import {
  ACCESS_CODE_ALPHABET,
  ACCESS_CODE_LENGTH,
  accessCodeState,
  formatAccessCode,
  generateAccessCode,
  hashAccessCode,
  normalizeAccessCode,
} from './access-code';

describe('access codes', () => {
  beforeAll(() => {
    process.env.JWT_SECRET ??= 'unit-test-secret';
  });

  it('are 10 characters from an alphabet with no look-alikes', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateAccessCode();
      expect(code).toHaveLength(ACCESS_CODE_LENGTH);
      expect([...code].every((c) => ACCESS_CODE_ALPHABET.includes(c))).toBe(true);
    }
    expect(ACCESS_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it('are not sequential or clustered: every position uses the whole alphabet', () => {
    const seen = Array.from({ length: ACCESS_CODE_LENGTH }, () => new Set<string>());
    for (let i = 0; i < 4000; i++) {
      [...generateAccessCode()].forEach((c, p) => seen[p].add(c));
    }
    for (const s of seen) expect(s.size).toBe(ACCESS_CODE_ALPHABET.length);
  });

  it('normalise case, spaces and dashes, and display in two groups', () => {
    expect(normalizeAccessCode(' ab-cde fghjk ')).toBe('ABCDEFGHJK');
    expect(formatAccessCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK');
    expect(formatAccessCode('ABCD')).toBe('ABCD');
  });

  it('are stored as a keyed hash: stable for a code, different for different codes and keys', () => {
    const a = hashAccessCode('ABCDEFGHJK');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAccessCode('ABCDEFGHJK')).toBe(a);
    expect(hashAccessCode('ABCDEFGHJM')).not.toBe(a);
    expect(a).not.toContain('ABCDEFGHJK');
    const before = process.env.ACCESS_CODE_PEPPER;
    process.env.ACCESS_CODE_PEPPER = 'another-key';
    expect(hashAccessCode('ABCDEFGHJK')).not.toBe(a);
    if (before === undefined) delete process.env.ACCESS_CODE_PEPPER;
    else process.env.ACCESS_CODE_PEPPER = before;
  });

  it('refuses to hash with no secret at all', () => {
    const jwt = process.env.JWT_SECRET;
    const pepper = process.env.ACCESS_CODE_PEPPER;
    delete process.env.JWT_SECRET;
    delete process.env.ACCESS_CODE_PEPPER;
    expect(() => hashAccessCode('ABCDEFGHJK')).toThrow(/must be set/);
    if (jwt !== undefined) process.env.JWT_SECRET = jwt;
    if (pepper !== undefined) process.env.ACCESS_CODE_PEPPER = pepper;
  });

  it('report their state: none, unused, active, expired, revoked', () => {
    const now = new Date('2026-09-30T12:00:00Z');
    const base = { status: 'ACTIVE' as const, expiresAt: null, lastUsedAt: null };
    expect(accessCodeState(null, now)).toBe('NONE');
    expect(accessCodeState(base, now)).toBe('UNUSED');
    expect(accessCodeState({ ...base, lastUsedAt: now }, now)).toBe('ACTIVE');
    expect(accessCodeState({ ...base, expiresAt: new Date('2026-09-30T11:59:59Z') }, now)).toBe('EXPIRED');
    expect(accessCodeState({ ...base, expiresAt: new Date('2026-10-01T00:00:00Z'), lastUsedAt: now }, now)).toBe('ACTIVE');
    expect(accessCodeState({ ...base, status: 'REVOKED', lastUsedAt: now }, now)).toBe('REVOKED');
  });
});
