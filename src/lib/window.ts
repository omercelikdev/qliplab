import { getCurrentWindow, LogicalSize, LogicalPosition, cursorPosition } from '@tauri-apps/api/window';
import { availableMonitors } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeHtmlAndText, writeImageBase64 } from 'tauri-plugin-clipboard-api';
import { usePreviewStore } from '@/stores/previewStore';
import { useSnippetStore } from '@/stores/snippetStore';
import { useAppStore } from '@/stores/appStore';
import { getImageBase64ForClipboard } from '@/lib/imageUtils';
import type { PasteQueueItem } from '@/stores/appStore';

const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 580;
const PREVIEW_WIDTH = 1300;
const PREVIEW_HEIGHT = 700;

// Remember last window size so it persists across show/hide cycles
let _lastWidth = DEFAULT_WIDTH;
let _lastHeight = DEFAULT_HEIGHT;

/** Guard against concurrent toggle operations (rapid double-tap). */
let toggleInFlight = false;

/** Queue paste guards — clipboard listener checks isQueuePasting to skip writes */
let _queuePasting = false;
let _queueInProgress = false;
export function isQueuePasting() { return _queuePasting; }

/** Write a single queue item to the system clipboard (text, HTML, or image). */
async function writeQueueItem(item: PasteQueueItem) {
  if (item.contentType === 'image') {
    const base64 = getImageBase64ForClipboard(item.content);
    if (base64) await writeImageBase64(base64);
  } else if (item.htmlContent) {
    await writeHtmlAndText(item.htmlContent, item.content);
  } else {
    await writeText(item.content);
  }
}

/** Center window on the monitor where the cursor is (multi-monitor aware).
 *  Falls back to JS screen API if Tauri monitor query fails. */
async function centerOf(width: number, height: number) {
  try {
    const cursor = await cursorPosition();
    const monitors = await availableMonitors();
    // Find the monitor containing the cursor
    const monitor = monitors.find((m) => {
      const pos = m.position;
      const size = m.size;
      return cursor.x >= pos.x && cursor.x < pos.x + size.width &&
             cursor.y >= pos.y && cursor.y < pos.y + size.height;
    }) ?? monitors[0];
    if (monitor) {
      const sf = monitor.scaleFactor;
      const mx = monitor.position.x / sf;
      const my = monitor.position.y / sf;
      const mw = monitor.size.width / sf;
      const mh = monitor.size.height / sf;
      return {
        x: Math.round(mx + (mw - width) / 2),
        y: Math.round(my + (mh - height) / 2),
      };
    }
  } catch {
    // Fall through to JS screen API
  }
  const sw = screen.availWidth;
  const sh = screen.availHeight;
  const st = (screen as unknown as { availTop?: number }).availTop ?? 0;
  const sl = (screen as unknown as { availLeft?: number }).availLeft ?? 0;
  return {
    x: sl + Math.round((sw - width) / 2),
    y: st + Math.round((sh - height) / 2),
  };
}

/** Reset UI state when hiding — no window resize, just state cleanup */
function resetUIState() {
  usePreviewStore.setState({ isOpen: false, pipelineSteps: [] });
  useSnippetStore.setState({ editorOpen: false, editingSnippet: null });
  useAppStore.getState().setOpenMenuItemId(null);
}

export async function expandWindowForPreview() {
  try {
    const appWindow = getCurrentWindow();

    // Clamp preview size to fit within screen with margin
    const margin = 40;
    const width = Math.min(PREVIEW_WIDTH, screen.availWidth - margin);
    const height = Math.min(PREVIEW_HEIGHT, screen.availHeight - margin);

    const { x, y } = await centerOf(width, height);
    await appWindow.setSize(new LogicalSize(width, height));
    await appWindow.setPosition(new LogicalPosition(x, y));
  } catch (e) {
    console.error('[qliplab] expandWindowForPreview failed:', e);
  }
}

export async function shrinkWindowFromPreview() {
  try {
    const appWindow = getCurrentWindow();
    const { x, y } = await centerOf(_lastWidth, _lastHeight);

    await appWindow.setSize(new LogicalSize(_lastWidth, _lastHeight));
    await appWindow.setPosition(new LogicalPosition(x, y));
  } catch (e) {
    console.error('[qliplab] shrinkWindowFromPreview failed:', e);
  }
}

/**
 * Core hide sequence:
 * 1. hide_panel → order_out + mouse events OFF (instantly invisible, no input capture)
 * 2. resetUIState → safe, panel already invisible
 * 3. hide() + setPosition(-10000) in parallel → Tauri state sync + offscreen park
 *
 * NO setSize here — hidden NSPanel ignores size changes on macOS.
 */
async function hideWindowCore() {
  const appWindow = getCurrentWindow();
  // Save current logical size so it persists across hide/show cycles.
  // innerSize() returns PhysicalSize — divide by scaleFactor to get logical.
  try {
    const size = await appWindow.innerSize();
    const sf = await appWindow.scaleFactor();
    const logicalW = Math.round(size.width / sf);
    const logicalH = Math.round(size.height / sf);
    if (logicalW > 0 && logicalH > 0) {
      _lastWidth = logicalW;
      _lastHeight = logicalH;
    }
  } catch {
    // Size read failed, keep previous values
  }
  await invoke('hide_panel');
  resetUIState();
  await Promise.all([
    appWindow.hide(),
    appWindow.setPosition(new LogicalPosition(-10000, -10000)),
  ]);
}

/**
 * Core show sequence ("Show-Then-Size"):
 * 1. show_panel → panel becomes visible via NSPanel.show() which calls
 *    makeKeyWindow (NOT activateIgnoringOtherApps). This keeps the panel
 *    as key window for keyboard input without making QlipLab the "active app".
 *    The previous app remains active, so CGEvent paste lands correctly.
 * 2. appWindow.show() → sync Tauri's internal window state (tao calls
 *    makeKeyAndOrderFront, but on a non-activating NSPanel this just
 *    orders front + makes key, it does NOT activate the app).
 * 3. setSize → WORKS because window is now visible
 * 4. setPosition(center) → moves to screen center
 * 5. signalWindowOpen() → reset keyboard nav, diff mode
 *
 * IMPORTANT: We do NOT call appWindow.setFocus() because Tauri's tao backend
 * calls activateIgnoringOtherApps, which overrides the panel's
 * NSWindowStyleMaskNonActivatingPanel flag and makes QlipLab the "active app".
 */
async function showWindowCore() {
  const appWindow = getCurrentWindow();

  // Step 1: Show panel (non-activating — previous app stays active)
  await invoke('show_panel');

  // Step 2: Sync Tauri internal state (no setFocus — that force-activates)
  await appWindow.show();

  // Step 3: Restore last size (or default on first open)
  await appWindow.setSize(new LogicalSize(_lastWidth, _lastHeight));

  // Step 4: Center on screen using remembered size
  const { x, y } = await centerOf(_lastWidth, _lastHeight);
  await appWindow.setPosition(new LogicalPosition(x, y));

  // Step 5: Signal open for keyboard nav reset
  useAppStore.getState().signalWindowOpen();
}

export async function showWindow() {
  try {
    await invoke('save_frontmost_app');
    await showWindowCore();
  } catch (e) {
    console.error('[qliplab] showWindow failed:', e);
  }
}

/**
 * Start consuming the paste queue — pastes ALL items sequentially.
 *
 * Flow:
 * 1. Save queue locally, clear UI mode
 * 2. Suppress clipboard listener (_queuePasting flag)
 * 3. Hide window + paste first item via hideWriteAndPaste
 * 4. Paste remaining items with 500ms delays (simulate_paste is async in Rust)
 * 5. Cleanup flags
 *
 * Handles text, HTML, and image content types.
 */
export async function startPasteQueue() {
  if (_queueInProgress) return;
  const { pasteQueue } = useAppStore.getState();
  if (pasteQueue.length === 0) return;

  _queueInProgress = true;
  _queuePasting = true;

  // Save queue locally and clear queue mode immediately
  const items = [...pasteQueue];
  useAppStore.getState().cancelQueue();

  try {
    // First item: write to clipboard + hide window + simulate paste
    await hideWriteAndPaste(() => writeQueueItem(items[0]));

    // Remaining items: write to clipboard + simulate paste (with delays)
    for (let i = 1; i < items.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        await writeQueueItem(items[i]);
        await invoke('simulate_paste');
      } catch {
        // Skip failed queue item
      }
    }
  } finally {
    _queuePasting = false;
    _queueInProgress = false;
  }
}

export async function toggleWindow() {
  if (toggleInFlight) return;
  toggleInFlight = true;
  try {
    const appWindow = getCurrentWindow();
    const visible = await appWindow.isVisible();
    if (visible) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      await hideWindowCore();
    } else {
      await invoke('save_frontmost_app');
      await showWindowCore();
    }
  } catch (e) {
    console.error('[qliplab] toggleWindow failed:', e);
  } finally {
    toggleInFlight = false;
  }
}

export async function hideWindow() {
  try {
    await hideWindowCore();
  } catch (e) {
    console.error('[qliplab] hideWindow failed:', e);
  }
}

export async function hideAndPaste() {
  try {
    await hideWindowCore();
    await invoke('simulate_paste');
  } catch (e) {
    console.error('[qliplab] hideAndPaste failed:', e);
  }
}

// Optimized version: clipboard write and window hide happen in parallel
export async function hideWriteAndPaste(writeToClipboard: () => Promise<void>) {
  try {
    const clipboardPromise = writeToClipboard();
    await hideWindowCore();
    await clipboardPromise;
    // Small buffer to ensure clipboard is fully committed at OS level before paste
    await new Promise(resolve => setTimeout(resolve, 30));
    await invoke('simulate_paste');
  } catch (e) {
    console.error('[qliplab] hideWriteAndPaste failed:', e);
  }
}

// Hide window then paste (clipboard already written)
export async function hideAndSimulatePaste() {
  try {
    await hideWindowCore();
    await invoke('simulate_paste');
  } catch (e) {
    console.error('[qliplab] hideAndSimulatePaste failed:', e);
  }
}
