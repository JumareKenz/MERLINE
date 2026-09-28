import { FieldLoginLimiter } from './field-login-limiter';

describe('FieldLoginLimiter', () => {
  let t = 0;
  const limiter = () => {
    const l = new FieldLoginLimiter();
    l.now = () => t;
    return l;
  };
  beforeEach(() => (t = 1_000_000));

  it('blocks an address after 8 wrong codes in 15 minutes', () => {
    const l = limiter();
    for (let i = 0; i < 7; i++) l.recordFailure('1.1.1.1');
    expect(l.retryAfterMs('1.1.1.1')).toBe(0);
    l.recordFailure('1.1.1.1');
    expect(l.retryAfterMs('1.1.1.1')).toBe(15 * 60_000);
    expect(l.retryAfterMs('2.2.2.2')).toBe(0);
  });

  it('forgets failures older than the window', () => {
    const l = limiter();
    for (let i = 0; i < 7; i++) l.recordFailure('ip');
    t += 16 * 60_000;
    l.recordFailure('ip');
    expect(l.retryAfterMs('ip')).toBe(0);
  });

  it('doubles each repeat block, up to a day', () => {
    const l = limiter();
    const block = () => {
      for (let i = 0; i < 8; i++) l.recordFailure('ip');
      const wait = l.retryAfterMs('ip');
      t += wait;
      return wait / 60_000;
    };
    expect([block(), block(), block(), block()]).toEqual([15, 30, 60, 120]);
    for (let i = 0; i < 6; i++) block();
    expect(block()).toBe(24 * 60);
  });

  it('a correct code clears the failures so far', () => {
    const l = limiter();
    for (let i = 0; i < 7; i++) l.recordFailure('ip');
    l.recordSuccess('ip');
    l.recordFailure('ip');
    expect(l.retryAfterMs('ip')).toBe(0);
  });
});
