import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Tauri APIs ──────────────────────────────────────────────────

/** A 1512×945 primary monitor at the origin, on a 2× display. */
const SCALE = 2;
const primary = {
  workArea: { position: { x: 0, y: 0 }, size: { width: 3024, height: 1890 } },
};

const mockWindow = {
  show: vi.fn().mockResolvedValue(undefined),
  hide: vi.fn().mockResolvedValue(undefined),
  setSize: vi.fn().mockResolvedValue(undefined),
  setPosition: vi.fn().mockResolvedValue(undefined),
  setFocus: vi.fn().mockResolvedValue(undefined),
  isVisible: vi.fn().mockResolvedValue(false),
  scaleFactor: vi.fn().mockResolvedValue(SCALE),
  // Physical pixels, as Tauri reports them: a 560×580 panel at logical (200, 100).
  innerSize: vi.fn().mockResolvedValue({ width: 1120, height: 1160 }),
  outerPosition: vi.fn().mockResolvedValue({ x: 400, y: 200 }),
};

const mockAvailableMonitors = vi.fn().mockResolvedValue([primary]);
const mockPrimaryMonitor = vi.fn().mockResolvedValue(primary);
const mockCurrentMonitor = vi.fn().mockResolvedValue(primary);

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => mockWindow,
  availableMonitors: () => mockAvailableMonitors(),
  primaryMonitor: () => mockPrimaryMonitor(),
  currentMonitor: () => mockCurrentMonitor(),
  LogicalSize: class LogicalSize {
    width: number;
    height: number;
    constructor(w: number, h: number) { this.width = w; this.height = h; }
  },
  LogicalPosition: class LogicalPosition {
    x: number;
    y: number;
    constructor(x: number, y: number) { this.x = x; this.y = y; }
  },
  PhysicalPosition: class PhysicalPosition {
    x: number;
    y: number;
    constructor(x: number, y: number) { this.x = x; this.y = y; }
  },
}));

const mockUpdateSettings = vi.fn();
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: { windowWidth: null, windowHeight: null, windowX: null, windowY: null },
      updateSettings: mockUpdateSettings,
    }),
  },
}));

// permissionStore is deliberately NOT mocked: the Accessibility-denied
// regression test drives it through the mocked `invoke` below.

vi.mock('@tauri-apps/api/core', () => ({
  // The paste helpers ask the backend for the Accessibility grant before hiding
  // the window; default to granted so the happy path is exercised.
  invoke: vi.fn((cmd: string) =>
    Promise.resolve(cmd === 'accessibility_granted' ? true : undefined)
  ),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
  writeText: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('tauri-plugin-clipboard-api', () => ({
  writeHtmlAndText: vi.fn().mockResolvedValue(undefined),
  writeImageBase64: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/stores/previewStore', () => ({
  usePreviewStore: {
    setState: vi.fn(),
  },
}));

vi.mock('@/stores/snippetStore', () => ({
  useSnippetStore: {
    setState: vi.fn(),
  },
}));

vi.mock('@/stores/appStore', () => ({
  useAppStore: {
    getState: vi.fn().mockReturnValue({
      setOpenMenuItemId: vi.fn(),
      signalWindowOpen: vi.fn(),
      pasteQueue: [],
      cancelQueue: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageBase64ForClipboard: vi.fn().mockReturnValue('base64data'),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  isQueuePasting,
  expandWindowForPreview,
  shrinkWindowFromPreview,
  showWindow,
  toggleWindow,
  hideWindow,
  hideAndPaste,
  hideWriteAndPaste,
  hideAndSimulatePaste,
  startPasteQueue,
} from './window';

describe('isQueuePasting', () => {
  it('returns false by default', () => {
    expect(isQueuePasting()).toBe(false);
  });
});

describe('expandWindowForPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets window size and position for preview', async () => {
    await expandWindowForPreview();
    expect(mockWindow.setSize).toHaveBeenCalled();
    expect(mockWindow.setPosition).toHaveBeenCalled();
  });

  it('handles window resize failure silently', async () => {
    mockWindow.setSize.mockRejectedValueOnce(new Error('fail'));
    await expect(expandWindowForPreview()).resolves.not.toThrow();
  });
});

describe('shrinkWindowFromPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets window back to default size', async () => {
    await shrinkWindowFromPreview();
    expect(mockWindow.setSize).toHaveBeenCalled();
    expect(mockWindow.setPosition).toHaveBeenCalled();
  });

  it('handles failure silently', async () => {
    mockWindow.setSize.mockRejectedValueOnce(new Error('fail'));
    await expect(shrinkWindowFromPreview()).resolves.not.toThrow();
  });
});

describe('showWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves frontmost app and shows window', async () => {
    await showWindow();
    expect(invoke).toHaveBeenCalledWith('save_frontmost_app');
    expect(invoke).toHaveBeenCalledWith('show_panel');
    expect(mockWindow.show).toHaveBeenCalled();
    expect(mockWindow.setSize).toHaveBeenCalled();
    expect(mockWindow.setPosition).toHaveBeenCalled();
  });

  it('handles failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (invoke as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fail'));
    await expect(showWindow()).resolves.not.toThrow();
    consoleSpy.mockRestore();
  });
});

describe('hideWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls hide_panel and hides the window', async () => {
    await hideWindow();
    expect(invoke).toHaveBeenCalledWith('hide_panel');
    expect(mockWindow.hide).toHaveBeenCalled();
    expect(mockWindow.setPosition).toHaveBeenCalled();
  });

  it('handles failure silently', async () => {
    (invoke as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fail'));
    await expect(hideWindow()).resolves.not.toThrow();
  });
});

describe('toggleWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows window when not visible', async () => {
    mockWindow.isVisible.mockResolvedValueOnce(false);
    await toggleWindow();
    expect(invoke).toHaveBeenCalledWith('save_frontmost_app');
    expect(invoke).toHaveBeenCalledWith('show_panel');
    expect(mockWindow.show).toHaveBeenCalled();
  });

  it('hides window when visible', async () => {
    mockWindow.isVisible.mockResolvedValueOnce(true);
    await toggleWindow();
    expect(invoke).toHaveBeenCalledWith('hide_panel');
    expect(mockWindow.hide).toHaveBeenCalled();
  });

  it('handles failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockWindow.isVisible.mockRejectedValueOnce(new Error('fail'));
    await expect(toggleWindow()).resolves.not.toThrow();
    consoleSpy.mockRestore();
  });
});

describe('hideAndPaste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides window and simulates paste', async () => {
    await hideAndPaste();
    expect(invoke).toHaveBeenCalledWith('hide_panel');
    expect(invoke).toHaveBeenCalledWith('simulate_paste');
  });

  it('handles failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (invoke as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fail'));
    await expect(hideAndPaste()).resolves.not.toThrow();
    consoleSpy.mockRestore();
  });
});

describe('hideWriteAndPaste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes clipboard, hides window, and simulates paste', async () => {
    const writeFn = vi.fn().mockResolvedValue(undefined);
    await hideWriteAndPaste(writeFn);
    expect(writeFn).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith('hide_panel');
    expect(invoke).toHaveBeenCalledWith('simulate_paste');
  });

  it('handles failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeFn = vi.fn().mockRejectedValue(new Error('clipboard fail'));
    await expect(hideWriteAndPaste(writeFn)).resolves.not.toThrow();
    consoleSpy.mockRestore();
  });

  // Regression: the window used to hide and then silently fail to paste, so the
  // user saw the app vanish and nothing arrive. Keep it visible and report false.
  it('keeps the window open and reports failure when Accessibility is denied', async () => {
    // Only the permission probe is overridden; the default impl stays intact
    // for the other suites (mockImplementation would leak across describes).
    vi.mocked(invoke).mockImplementationOnce(() => Promise.resolve(false));
    const writeFn = vi.fn().mockResolvedValue(undefined);

    const pasted = await hideWriteAndPaste(writeFn);

    expect(pasted).toBe(false);
    expect(writeFn).toHaveBeenCalled(); // clipboard still holds the content
    expect(invoke).not.toHaveBeenCalledWith('hide_panel');
    expect(invoke).not.toHaveBeenCalledWith('simulate_paste');
  });
});

describe('hideAndSimulatePaste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides and pastes', async () => {
    await hideAndSimulatePaste();
    expect(invoke).toHaveBeenCalledWith('hide_panel');
    expect(invoke).toHaveBeenCalledWith('simulate_paste');
  });
});

describe('startPasteQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when queue is empty', async () => {
    await startPasteQueue();
    expect(invoke).not.toHaveBeenCalledWith('simulate_paste');
  });
});

describe('geometry persistence', () => {
  /** Last position handed to setPosition, in physical pixels. */
  const lastPosition = () => {
    const calls = mockWindow.setPosition.mock.calls;
    return calls[calls.length - 1][0] as { x: number; y: number };
  };
  const savedSettings = () => mockUpdateSettings.mock.calls[0][0];

  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.scaleFactor.mockResolvedValue(SCALE);
    mockWindow.innerSize.mockResolvedValue({ width: 1120, height: 1160 });
    mockWindow.outerPosition.mockResolvedValue({ x: 400, y: 200 });
    mockAvailableMonitors.mockResolvedValue([primary]);
    mockPrimaryMonitor.mockResolvedValue(primary);
    mockCurrentMonitor.mockResolvedValue(primary);
  });

  it('persists the panel size and position on hide', async () => {
    await hideWindow();
    expect(savedSettings()).toEqual({
      windowWidth: 560,
      windowHeight: 580,
      windowX: 400,
      windowY: 200,
    });
  });

  // Regression: hideWindowCore read the live size, which the preview had grown
  // to 1300×700. That size was persisted, so the compact panel reopened
  // 1300px wide and shrinkWindowFromPreview could never restore it.
  it('persists the compact size, not the preview size, when hidden from preview', async () => {
    await expandWindowForPreview();
    // The window really is preview-sized now.
    mockWindow.innerSize.mockResolvedValue({ width: 2600, height: 1400 });
    mockWindow.outerPosition.mockResolvedValue({ x: 212, y: 245 });

    await hideWindow();

    expect(savedSettings()).toEqual({
      windowWidth: 560,
      windowHeight: 580,
      windowX: 400,
      windowY: 200,
    });
  });

  it('restores the pre-preview geometry instead of re-centering', async () => {
    await expandWindowForPreview();
    mockWindow.setPosition.mockClear();

    await shrinkWindowFromPreview();

    expect(mockWindow.setSize).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 560, height: 580 })
    );
    expect(lastPosition()).toEqual({ x: 400, y: 200 });
  });

  // Regression: a hidden window is parked at (-10000, -10000). Persisting that
  // reopened the panel offscreen forever, with no way to drag it back.
  it('never persists the offscreen park coordinates', async () => {
    mockWindow.outerPosition.mockResolvedValue({ x: -10000, y: -10000 });

    await hideWindow();

    const saved = savedSettings();
    expect(saved.windowX).not.toBe(-10000);
    expect(saved.windowY).not.toBe(-10000);
  });

  it('reopens exactly where it was hidden', async () => {
    await hideWindow();
    mockWindow.setPosition.mockClear();

    await showWindow();

    expect(lastPosition()).toEqual({ x: 400, y: 200 });
  });

  // Regression: hide the panel on an external display, then undock. The saved
  // coordinates name no monitor any more, so the panel must come home.
  it('recenters on the primary when the saved monitor is gone', async () => {
    mockWindow.outerPosition.mockResolvedValue({ x: 4000, y: 300 });
    await hideWindow();
    mockWindow.setPosition.mockClear();

    await showWindow();

    // Centered on the 3024×1890 primary for a 1120×1160 physical panel.
    expect(lastPosition()).toEqual({ x: 952, y: 365 });
  });

  it('falls back to the screen API when no monitors are reported', async () => {
    mockAvailableMonitors.mockResolvedValue([]);
    mockPrimaryMonitor.mockResolvedValue(null);
    await expect(showWindow()).resolves.not.toThrow();
    expect(mockWindow.setPosition).toHaveBeenCalled();
  });
});
