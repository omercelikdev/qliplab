/**
 * The clipboard listener skips recording the next change in two cases: a vault
 * paste (so secrets never land in history) and an auto-command rewrite (so it
 * doesn't re-trigger itself). A safety timer clears the flag if the expected
 * clipboard event never arrives.
 *
 * The timer handle is shared and cancelled on every re-arm and consume. Without
 * that, a rapid second vault paste re-sets the flag while the FIRST paste's
 * stale 2s timer is still pending — and when it fires it clears the flag before
 * the second paste's (100–500ms-lagged) clipboard event lands, leaking the
 * second secret into history.
 */
let skipping = false;
let resetTimer: ReturnType<typeof setTimeout> | null = null;

/** Reset window: long enough to cover clipboard-event lag, short enough that a
 *  missed event doesn't wedge capture off for long. */
export const SKIP_RESET_MS = 2000;

function clearResetTimer(): void {
  if (resetTimer !== null) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
}

/** Arm the skip flag (re-arming cancels any prior safety timer). */
export function armSkip(): void {
  skipping = true;
  clearResetTimer();
  resetTimer = setTimeout(() => {
    skipping = false;
    resetTimer = null;
  }, SKIP_RESET_MS);
}

/** Consume the flag: returns true and disarms if it was set, false otherwise. */
export function consumeSkip(): boolean {
  if (!skipping) return false;
  skipping = false;
  clearResetTimer();
  return true;
}

export function isSkipping(): boolean {
  return skipping;
}
