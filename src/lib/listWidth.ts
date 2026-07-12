/**
 * Persistence for the list ⇆ preview splitter position.
 *
 * The divider used to snap back to a default every time the window reopened,
 * discarding the width the user had dragged to. We store it in localStorage
 * (same bucket as the other UI prefs in appStore) and clamp on the way in and
 * out, so a stored value from an older build with different bounds — or a
 * corrupted entry — can never push the layout off-screen.
 */

export const LIST_WIDTH_MIN = 200;
export const LIST_WIDTH_MAX = 500;
export const LIST_WIDTH_DEFAULT = 300;

const KEY = 'qlip_listWidth';

export function clampListWidth(width: number): number {
  if (!Number.isFinite(width)) return LIST_WIDTH_DEFAULT;
  return Math.min(LIST_WIDTH_MAX, Math.max(LIST_WIDTH_MIN, Math.round(width)));
}

export function loadListWidth(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return LIST_WIDTH_DEFAULT;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return LIST_WIDTH_DEFAULT;
    return clampListWidth(n);
  } catch {
    return LIST_WIDTH_DEFAULT;
  }
}

export function saveListWidth(width: number): void {
  try {
    localStorage.setItem(KEY, String(clampListWidth(width)));
  } catch {
    /* localStorage unavailable (private mode / quota) — width just won't persist */
  }
}
