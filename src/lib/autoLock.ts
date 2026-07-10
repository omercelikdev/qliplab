/**
 * Vault auto-lock timing.
 *
 * The settings UI stores "Never" as 0 minutes. Multiplying that out yields a
 * 0 ms timeout, which fires on the next tick — so a naive
 * `setTimeout(lock, minutes * 60_000)` locks the vault immediately after every
 * unlock, i.e. the exact opposite of what the user asked for.
 */

/**
 * Delay before the vault should auto-lock, in milliseconds.
 * Returns `null` when auto-lock is disabled and no timer should be scheduled.
 */
export function computeAutoLockDelayMs(minutes: number): number | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return minutes * 60 * 1000;
}
