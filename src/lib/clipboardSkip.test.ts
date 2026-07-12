import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { armSkip, consumeSkip, isSkipping, SKIP_RESET_MS } from './clipboardSkip';

describe('clipboard skip flag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    consumeSkip(); // disarm any leftover state
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('arms and consumes once', () => {
    expect(isSkipping()).toBe(false);
    armSkip();
    expect(isSkipping()).toBe(true);
    expect(consumeSkip()).toBe(true);
    expect(isSkipping()).toBe(false);
    expect(consumeSkip()).toBe(false); // second consume is a no-op
  });

  it('auto-clears after the safety window if never consumed', () => {
    armSkip();
    vi.advanceTimersByTime(SKIP_RESET_MS + 1);
    expect(isSkipping()).toBe(false);
  });

  // Regression: a rapid second vault paste re-arms the flag; the FIRST paste's
  // stale timer must not clear it before the second clipboard event lands.
  it('re-arming cancels the previous safety timer', () => {
    armSkip(); // t=0, first timer would fire at t=2000
    vi.advanceTimersByTime(SKIP_RESET_MS - 100); // t=1900
    armSkip(); // re-arm — first timer cancelled, new one at t=3900
    vi.advanceTimersByTime(200); // t=2100 — past the FIRST timer's old deadline
    // If the old timer had survived, the flag would be false and the second
    // secret would leak. It must still be armed.
    expect(isSkipping()).toBe(true);
    expect(consumeSkip()).toBe(true);
  });

  it('consuming cancels the pending timer so it cannot clear a later arm', () => {
    armSkip();
    expect(consumeSkip()).toBe(true); // consumed early; timer must be cancelled
    armSkip(); // fresh arm
    vi.advanceTimersByTime(SKIP_RESET_MS - 1);
    // The first arm's timer, had it survived, would fire around here and
    // wrongly clear this fresh flag.
    expect(isSkipping()).toBe(true);
  });
});
