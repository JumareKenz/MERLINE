import { backoffDelayMs } from './job-errors';

describe('backoffDelayMs', () => {
  it('doubles from 30 seconds and caps at 30 minutes', () => {
    expect(backoffDelayMs(1)).toBe(30_000);
    expect(backoffDelayMs(2)).toBe(60_000);
    expect(backoffDelayMs(4)).toBe(240_000);
    expect(backoffDelayMs(20)).toBe(30 * 60_000);
  });

  it('never retries sooner than the provider asked', () => {
    expect(backoffDelayMs(1, 90_000)).toBe(90_000);
    expect(backoffDelayMs(3, 1_000)).toBe(120_000);
  });
});
