import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Tauri APIs ──────────────────────────────────────────────────

const mockWindow = {
  show: vi.fn().mockResolvedValue(undefined),
  hide: vi.fn().mockResolvedValue(undefined),
  setSize: vi.fn().mockResolvedValue(undefined),
  setPosition: vi.fn().mockResolvedValue(undefined),
  setFocus: vi.fn().mockResolvedValue(undefined),
  isVisible: vi.fn().mockResolvedValue(false),
};

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => mockWindow,
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
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
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
