/**
 * Pure geometry helpers for placing the panel.
 *
 * Everything here works in a single coordinate space — the caller decides
 * whether that is physical or logical pixels — so the maths stays testable
 * without a running window.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Hidden windows are parked far offscreen so they cannot capture input.
 * Anything this far out is a park coordinate, never a place the user put the
 * window, and must never be persisted: restoring it would open the panel
 * where nobody can see it, with no way to drag it back.
 */
export const PARK_X = -10000;
export const PARK_Y = -10000;
const PARK_THRESHOLD = -5000;

export function isParkedPosition(x: number, y: number): boolean {
  return x <= PARK_THRESHOLD || y <= PARK_THRESHOLD;
}

export function centerIn(area: Rect, width: number, height: number): { x: number; y: number } {
  return {
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
  };
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Pull a window back onto a monitor that still exists.
 *
 * Undocking an external display, or rearranging monitors on Windows, leaves the
 * saved position pointing at coordinates no screen covers any more. Without this
 * the panel reopens invisibly and the only fix is deleting settings.json.
 *
 * `monitors[0]` is the fallback target, so pass the primary monitor first.
 */
export function clampToMonitors(rect: Rect, monitors: Rect[]): { x: number; y: number } {
  if (monitors.length === 0) return { x: rect.x, y: rect.y };

  let best = monitors[0];
  let bestOverlap = 0;
  for (const monitor of monitors) {
    const overlap = overlapArea(rect, monitor);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = monitor;
    }
  }

  // Nothing on any screen — the display it lived on is gone.
  if (bestOverlap === 0) return centerIn(best, rect.width, rect.height);

  return {
    x: clamp(rect.x, best.x, best.x + Math.max(0, best.width - rect.width)),
    y: clamp(rect.y, best.y, best.y + Math.max(0, best.height - rect.height)),
  };
}

/** Shrink a desired size so it fits inside `area`, keeping `margin` free. */
export function fitToArea(
  width: number,
  height: number,
  area: Rect,
  margin: number
): { width: number; height: number } {
  return {
    width: Math.max(1, Math.min(width, area.width - margin)),
    height: Math.max(1, Math.min(height, area.height - margin)),
  };
}

/** Put the primary monitor first so it becomes the fallback in `clampToMonitors`. */
export function primaryFirst(monitors: Rect[], primary: Rect | null): Rect[] {
  if (!primary) return monitors;
  const index = monitors.findIndex((m) => m.x === primary.x && m.y === primary.y);
  if (index <= 0) return monitors;
  const reordered = [...monitors];
  const [found] = reordered.splice(index, 1);
  reordered.unshift(found);
  return reordered;
}
