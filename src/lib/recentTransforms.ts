const STORAGE_KEY = 'qlip_recentTransforms';

/** How many recent transforms to remember. Enough to be a shortcut, few enough
 *  that the "Recent" group never crowds out the suggestions below it. */
export const MAX_RECENT_TRANSFORMS = 5;

/**
 * Put `id` at the front of the recent list, deduped and capped.
 *
 * Pure so the ordering is testable without touching storage: re-running a
 * transform already in the list moves it to the front rather than adding a
 * duplicate.
 */
export function addRecentId(list: string[], id: string, max = MAX_RECENT_TRANSFORMS): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

export function getRecentTransformIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function pushRecentTransform(id: string): string[] {
  const next = addRecentId(getRecentTransformIds(), id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — recents are a convenience, not critical.
  }
  return next;
}
