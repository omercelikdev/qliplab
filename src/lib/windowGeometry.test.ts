import { describe, it, expect } from 'vitest';
import {
  PARK_X,
  PARK_Y,
  isParkedPosition,
  centerIn,
  clampToMonitors,
  fitToArea,
  primaryFirst,
  type Rect,
} from './windowGeometry';

const laptop: Rect = { x: 0, y: 0, width: 1512, height: 945 };
const external: Rect = { x: 1512, y: -200, width: 2560, height: 1440 };

describe('isParkedPosition', () => {
  it('recognises the coordinates a hidden window is parked at', () => {
    expect(isParkedPosition(PARK_X, PARK_Y)).toBe(true);
  });

  it('recognises a park on either axis alone', () => {
    expect(isParkedPosition(-10000, 300)).toBe(true);
    expect(isParkedPosition(300, -10000)).toBe(true);
  });

  it('accepts real positions, including a monitor placed left of primary', () => {
    expect(isParkedPosition(0, 0)).toBe(false);
    expect(isParkedPosition(376, 178)).toBe(false);
    // An external display arranged to the left has negative coordinates and is
    // a perfectly valid place for the panel to live.
    expect(isParkedPosition(-1920, -300)).toBe(false);
  });
});

describe('centerIn', () => {
  it('centres within the monitor, not the origin', () => {
    expect(centerIn(external, 560, 580)).toEqual({ x: 1512 + 1000, y: -200 + 430 });
  });
});

describe('clampToMonitors', () => {
  it('leaves a fully visible window alone', () => {
    const pos = clampToMonitors({ x: 400, y: 200, width: 560, height: 580 }, [laptop]);
    expect(pos).toEqual({ x: 400, y: 200 });
  });

  it('pulls a partly offscreen window fully onto its monitor', () => {
    const pos = clampToMonitors({ x: 1400, y: 900, width: 560, height: 580 }, [laptop]);
    expect(pos).toEqual({ x: 1512 - 560, y: 945 - 580 });
  });

  // The bug this exists for: hide the panel on an external display, undock,
  // press the shortcut. Without clamping it reopens at x=2000 — invisible.
  it('recentres on the primary when the saved monitor is gone', () => {
    const pos = clampToMonitors({ x: 2000, y: 400, width: 560, height: 580 }, [laptop]);
    expect(pos).toEqual(centerIn(laptop, 560, 580));
  });

  it('keeps the window on the external display it was left on', () => {
    const pos = clampToMonitors({ x: 2000, y: 400, width: 560, height: 580 }, [laptop, external]);
    expect(pos).toEqual({ x: 2000, y: 400 });
  });

  it('chooses the monitor holding most of the window', () => {
    // Straddles the seam, mostly on the external display.
    const pos = clampToMonitors({ x: 1450, y: 100, width: 560, height: 580 }, [laptop, external]);
    expect(pos).toEqual({ x: 1512, y: 100 });
  });

  it('pins to the monitor origin when the window is larger than the screen', () => {
    const pos = clampToMonitors({ x: -50, y: -50, width: 3000, height: 2000 }, [laptop]);
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  it('passes the position through when no monitors are reported', () => {
    const pos = clampToMonitors({ x: 42, y: 43, width: 560, height: 580 }, []);
    expect(pos).toEqual({ x: 42, y: 43 });
  });
});

describe('fitToArea', () => {
  it('leaves a size that already fits', () => {
    expect(fitToArea(1300, 700, external, 40)).toEqual({ width: 1300, height: 700 });
  });

  it('shrinks the preview to fit a small screen, keeping the margin', () => {
    const small: Rect = { x: 0, y: 0, width: 1280, height: 600 };
    expect(fitToArea(1300, 700, small, 40)).toEqual({ width: 1240, height: 560 });
  });

  it('never returns a non-positive size', () => {
    const tiny: Rect = { x: 0, y: 0, width: 20, height: 20 };
    expect(fitToArea(1300, 700, tiny, 40)).toEqual({ width: 1, height: 1 });
  });
});

describe('primaryFirst', () => {
  it('moves the primary monitor to the front so it becomes the fallback', () => {
    expect(primaryFirst([external, laptop], laptop)).toEqual([laptop, external]);
  });

  it('is a no-op when the primary is already first or unknown', () => {
    expect(primaryFirst([laptop, external], laptop)).toEqual([laptop, external]);
    expect(primaryFirst([laptop, external], null)).toEqual([laptop, external]);
  });
});
