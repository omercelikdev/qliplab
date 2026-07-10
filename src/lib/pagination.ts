/** Rows fetched per page in the history list. */
export const PAGE_SIZE = 50;

/**
 * How many rows to re-fetch when refreshing a list the user may have expanded
 * with "Load more".
 *
 * Refreshing with a plain PAGE_SIZE would silently collapse an expanded list
 * back to its first page — which happens on every clipboard copy, since the
 * listener fires on system-wide changes while the window is open.
 */
export function refreshWindowLimit(loadedCount: number, pageSize: number = PAGE_SIZE): number {
  if (!Number.isFinite(loadedCount) || loadedCount <= pageSize) return pageSize;
  return loadedCount;
}

/**
 * Offset to use after one row was removed from the loaded window.
 *
 * The next "Load more" reads `LIMIT ? OFFSET currentOffset`. If the offset is
 * not decremented after a delete, every row shifts down by one and the row that
 * moved into the old offset position is skipped — it becomes invisible until a
 * full reload.
 */
export function offsetAfterDelete(currentOffset: number, wasInLoadedWindow: boolean): number {
  if (!wasInLoadedWindow) return currentOffset;
  return Math.max(0, currentOffset - 1);
}
