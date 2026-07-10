import {
  getCurrentWindow,
  LogicalSize,
  PhysicalPosition,
  currentMonitor,
  primaryMonitor,
  availableMonitors,
  type Window,
} from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import {
  PARK_X,
  PARK_Y,
  isParkedPosition,
  centerIn,
  clampToMonitors,
  fitToArea,
  primaryFirst,
  type Rect,
} from '@/lib/windowGeometry';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeHtmlAndText, writeImageBase64 } from 'tauri-plugin-clipboard-api';
import { usePreviewStore } from '@/stores/previewStore';
import { useSnippetStore } from '@/stores/snippetStore';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getImageBase64ForClipboard } from '@/lib/imageUtils';
import { usePermissionStore } from '@/stores/permissionStore';
import type { PasteQueueItem } from '@/stores/appStore';

const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 580;
const PREVIEW_WIDTH = 1300;
const PREVIEW_HEIGHT = 700;

/** Panel geometry: size in logical px (stable across DPI), position in physical
 *  px (the space monitors report, so clamping needs no scale juggling). */
interface Geometry {
  width: number;
  height: number;
  x: number;
  y: number;
}

// Remember last window size & position so it opens where the user left it (Ditto-like)
// Initialized from persisted settings, updated on each hide
let _lastWidth = DEFAULT_WIDTH;
let _lastHeight = DEFAULT_HEIGHT;
let _lastX: number | null = null;
let _lastY: number | null = null;
let _initialized = false;

/** Compact geometry captured before the preview inflated the window, or null
 *  when the preview is closed. See `expandWindowForPreview`. */
let _preExpand: Geometry | null = null;

/** Load persisted window position/size from settings (once on first show).
 *  windowX/windowY are physical pixels. Values written by older builds were
 *  logical, so on a Retina display they land at half the intended offset —
 *  still on screen, and rewritten correctly on the next hide. */
function initFromSettings() {
  if (_initialized) return;
  _initialized = true;
  const s = useSettingsStore.getState().settings;
  if (s.windowWidth && s.windowHeight) {
    _lastWidth = s.windowWidth;
    _lastHeight = s.windowHeight;
  }
  if (s.windowX !== null && s.windowY !== null) {
    _lastX = s.windowX;
    _lastY = s.windowY;
  }
}

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

/** The JS `screen` API only ever describes the primary display, at its own DPI.
 *  Tauri reports every monitor in physical pixels, which is what we place in. */
function toRect(monitor: { workArea: { position: { x: number; y: number }; size: { width: number; height: number } } }): Rect {
  return {
    x: monitor.workArea.position.x,
    y: monitor.workArea.position.y,
    width: monitor.workArea.size.width,
    height: monitor.workArea.size.height,
  };
}

/** Last-resort work area when Tauri cannot enumerate monitors. */
function screenFallback(scaleFactor: number): Rect {
  return {
    x: 0,
    y: 0,
    width: Math.round(screen.availWidth * scaleFactor),
    height: Math.round(screen.availHeight * scaleFactor),
  };
}

/** Every monitor's work area, primary first so it is the clamp fallback. */
async function workAreas(scaleFactor: number): Promise<Rect[]> {
  try {
    const [monitors, primary] = await Promise.all([availableMonitors(), primaryMonitor()]);
    if (monitors.length === 0) return [screenFallback(scaleFactor)];
    return primaryFirst(monitors.map(toRect), primary ? toRect(primary) : null);
  } catch {
    return [screenFallback(scaleFactor)];
  }
}

/** Work area of the monitor the window currently sits on. */
async function currentArea(scaleFactor: number): Promise<Rect> {
  try {
    const monitor = (await currentMonitor()) ?? (await primaryMonitor());
    if (monitor) return toRect(monitor);
  } catch {
    // fall through
  }
  return screenFallback(scaleFactor);
}

/**
 * Size the window, then put it where it belongs: back at `position` if that is
 * still on a connected monitor, otherwise centered on the primary.
 */
async function placeWindow(
  appWindow: Window,
  geom: { width: number; height: number; x: number | null; y: number | null }
) {
  const scaleFactor = await appWindow.scaleFactor();

  const physical = {
    width: Math.round(geom.width * scaleFactor),
    height: Math.round(geom.height * scaleFactor),
  };
  // Querying monitors hits the OS; overlap it with the resize so the summon
  // shortcut stays snappy.
  const [, areas] = await Promise.all([
    appWindow.setSize(new LogicalSize(geom.width, geom.height)),
    workAreas(scaleFactor),
  ]);

  const { x, y } = geom;
  const position =
    x !== null && y !== null && !isParkedPosition(x, y)
      ? clampToMonitors({ ...physical, x, y }, areas)
      : centerIn(areas[0], physical.width, physical.height);

  await appWindow.setPosition(new PhysicalPosition(position.x, position.y));
}

/** Read the window's live geometry, or null when it reports nothing usable. */
async function readGeometry(appWindow: Window): Promise<Geometry | null> {
  try {
    const scaleFactor = await appWindow.scaleFactor();
    const [size, position] = await Promise.all([appWindow.innerSize(), appWindow.outerPosition()]);
    const width = Math.round(size.width / scaleFactor);
    const height = Math.round(size.height / scaleFactor);
    if (width <= 0 || height <= 0) return null;
    return { width, height, x: position.x, y: position.y };
  } catch {
    return null;
  }
}

/** Reset UI state when hiding — no window resize, just state cleanup */
function resetUIState() {
  usePreviewStore.setState({ isOpen: false, pipelineSteps: [] });
  useSnippetStore.setState({ editorOpen: false, editingSnippet: null });
  useAppStore.getState().setOpenMenuItemId(null);
}

/**
 * Grow the window to hold the preview panel, remembering the compact geometry
 * first. Opening a transform then re-opening another one calls this again while
 * already expanded — the guard keeps that from capturing the preview's own size
 * as the panel's size.
 */
export async function expandWindowForPreview() {
  try {
    const appWindow = getCurrentWindow();
    // Capture once: a second call arrives with the window already expanded, and
    // reading it then would record the preview's size as the panel's size.
    if (!_preExpand) {
      _preExpand = (await readGeometry(appWindow)) ?? {
        width: _lastWidth,
        height: _lastHeight,
        x: _lastX ?? PARK_X,
        y: _lastY ?? PARK_Y,
      };
    }

    const scaleFactor = await appWindow.scaleFactor();
    const area = await currentArea(scaleFactor);
    // The work area is physical; the size we set is logical.
    const margin = Math.round(40 * scaleFactor);
    const fitted = fitToArea(
      Math.round(PREVIEW_WIDTH * scaleFactor),
      Math.round(PREVIEW_HEIGHT * scaleFactor),
      area,
      margin
    );
    await appWindow.setSize(
      new LogicalSize(Math.round(fitted.width / scaleFactor), Math.round(fitted.height / scaleFactor))
    );
    const { x, y } = centerIn(area, fitted.width, fitted.height);
    await appWindow.setPosition(new PhysicalPosition(x, y));
  } catch (e) {
    console.error('[qliplab] expandWindowForPreview failed:', e);
  }
}

/** Restore the panel to exactly where and how big it was before the preview. */
export async function shrinkWindowFromPreview() {
  const restore = _preExpand ?? { width: _lastWidth, height: _lastHeight, x: _lastX, y: _lastY };
  _preExpand = null;
  try {
    await placeWindow(getCurrentWindow(), restore);
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

  // Hiding while the preview is open must not persist the preview's size: the
  // compact panel would reopen 1300px wide and never shrink back. The geometry
  // captured before the preview expanded is the panel's real size.
  const expanded = _preExpand;
  _preExpand = null;
  const geom = expanded ?? (await readGeometry(appWindow));

  if (geom) {
    _lastWidth = geom.width;
    _lastHeight = geom.height;
    // Never persist the park coordinates — a hide that races another hide would
    // otherwise save -10000 and the panel could never be summoned back.
    if (!isParkedPosition(geom.x, geom.y)) {
      _lastX = geom.x;
      _lastY = geom.y;
    }
    // Persist to settings so position survives app restart
    useSettingsStore.getState().updateSettings({
      windowX: _lastX,
      windowY: _lastY,
      windowWidth: _lastWidth,
      windowHeight: _lastHeight,
    });
  }

  await invoke('hide_panel');
  resetUIState();
  await Promise.all([
    appWindow.hide(),
    appWindow.setPosition(new PhysicalPosition(PARK_X, PARK_Y)),
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
  initFromSettings();
  const appWindow = getCurrentWindow();

  // Step 1: Show panel (non-activating — previous app stays active)
  await invoke('show_panel');

  // Step 2: Sync Tauri internal state (no setFocus — that force-activates)
  await appWindow.show();

  // Step 3+4: Restore size, then position — clamped onto a monitor that still
  // exists, so undocking a display never strands the panel offscreen.
  await placeWindow(appWindow, {
    width: _lastWidth,
    height: _lastHeight,
    x: _lastX,
    y: _lastY,
  });

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

/**
 * Auto-paste needs macOS Accessibility. Without it `simulate_paste` posts no
 * event, so hiding the window first would leave the user staring at their
 * editor wondering why nothing arrived. Keep the window up instead and let the
 * permission banner explain — the clipboard still holds the content, so a
 * manual Cmd+V works.
 *
 * @returns true when the content was pasted into the previous app.
 */
async function pasteOrExplain(): Promise<boolean> {
  if (!(await usePermissionStore.getState().check())) return false;
  await hideWindowCore();
  await invoke('simulate_paste');
  return true;
}

export async function hideAndPaste(): Promise<boolean> {
  try {
    return await pasteOrExplain();
  } catch (e) {
    console.error('[qliplab] hideAndPaste failed:', e);
    return false;
  }
}

export async function hideWriteAndPaste(writeToClipboard: () => Promise<void>): Promise<boolean> {
  try {
    // Always put the content on the clipboard, even when we cannot auto-paste.
    await writeToClipboard();
    if (!(await usePermissionStore.getState().check())) return false;

    await hideWindowCore();
    // Small buffer to ensure clipboard is fully committed at OS level before paste
    await new Promise(resolve => setTimeout(resolve, 30));
    await invoke('simulate_paste');
    return true;
  } catch (e) {
    console.error('[qliplab] hideWriteAndPaste failed:', e);
    return false;
  }
}

// Hide window then paste (clipboard already written)
export async function hideAndSimulatePaste(): Promise<boolean> {
  try {
    return await pasteOrExplain();
  } catch (e) {
    console.error('[qliplab] hideAndSimulatePaste failed:', e);
    return false;
  }
}
