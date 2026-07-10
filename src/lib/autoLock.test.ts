import { describe, it, expect } from 'vitest';
import { computeAutoLockDelayMs } from './autoLock';

describe('computeAutoLockDelayMs', () => {
  it('converts minutes to milliseconds', () => {
    expect(computeAutoLockDelayMs(1)).toBe(60_000);
    expect(computeAutoLockDelayMs(5)).toBe(300_000);
    expect(computeAutoLockDelayMs(15)).toBe(900_000);
  });

  // Regression: "Never" is stored as 0, which used to produce setTimeout(lock, 0)
  // and re-locked the vault on the tick right after unlocking.
  it('returns null for 0 ("Never") instead of a zero delay', () => {
    expect(computeAutoLockDelayMs(0)).toBeNull();
  });

  it('returns null for negative or non-finite values', () => {
    expect(computeAutoLockDelayMs(-1)).toBeNull();
    expect(computeAutoLockDelayMs(NaN)).toBeNull();
    expect(computeAutoLockDelayMs(Infinity)).toBeNull();
  });

  it('never returns 0, so a timer is never scheduled to fire immediately', () => {
    for (const m of [0, -0, -5, NaN]) {
      expect(computeAutoLockDelayMs(m)).not.toBe(0);
    }
  });
});
