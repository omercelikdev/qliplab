import { getCurrentWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { usePreviewStore } from '@/stores/previewStore';
import { useAppStore } from '@/stores/appStore';

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 450;
const PREVIEW_WIDTH = 1300;
const PREVIEW_HEIGHT = 700;

/** Guard against concurrent toggle operations (rapid double-tap). */
let toggleInFlight = false;

/** Use JS screen API — always returns correct logical dimensions regardless of window position. */
function centerOf(width: number, height: number) {
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
  useAppStore.getState().setOpenMenuItemId(null);
}

export async function expandWindowForPreview() {
  try {
    const appWindow = getCurrentWindow();

    // Clamp preview size to fit within screen with margin
    const margin = 40;
    const width = Math.min(PREVIEW_WIDTH, screen.availWidth - margin);
    const height = Math.min(PREVIEW_HEIGHT, screen.availHeight - margin);

    const { x, y } = centerOf(width, height);
    await appWindow.setSize(new LogicalSize(width, height));
    await appWindow.setPosition(new LogicalPosition(x, y));
  } catch (error) {
    console.error('Failed to expand window:', error);
  }
}

export async function shrinkWindowFromPreview() {
  try {
    const appWindow = getCurrentWindow();
    const { x, y } = centerOf(DEFAULT_WIDTH, DEFAULT_HEIGHT);

    await appWindow.setSize(new LogicalSize(DEFAULT_WIDTH, DEFAULT_HEIGHT));
    await appWindow.setPosition(new LogicalPosition(x, y));
  } catch (error) {
    console.error('Failed to shrink window:', error);
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
  await invoke('hide_panel');
  resetUIState();
  await Promise.all([
    appWindow.hide(),
    appWindow.setPosition(new LogicalPosition(-10000, -10000)),
  ]);
}

/**
 * Core show sequence ("Show-Then-Size"):
 * 1. show_panel + show() → window becomes visible but at offscreen (-10000,-10000)
 *    (mouse events ON but offscreen → safe, no user interaction possible)
 * 2. setSize(420, 450) → WORKS because window is now visible
 * 3. setPosition(center) → moves to screen center → user sees window HERE
 * 4. setFocus()
 * 5. signalWindowOpen() → reset keyboard nav, diff mode
 */
async function showWindowCore() {
  const appWindow = getCurrentWindow();

  // Step 1: Make visible offscreen
  await invoke('show_panel');
  await appWindow.show();

  // Step 2: Set size (works because window is now visible)
  await appWindow.setSize(new LogicalSize(DEFAULT_WIDTH, DEFAULT_HEIGHT));

  // Step 3: Center on screen
  const { x, y } = centerOf(DEFAULT_WIDTH, DEFAULT_HEIGHT);
  await appWindow.setPosition(new LogicalPosition(x, y));

  // Step 4: Focus
  try { await appWindow.setFocus(); } catch { /* User can click to focus */ }

  // Step 5: Signal open for keyboard nav reset
  useAppStore.getState().signalWindowOpen();
}

export async function showWindow() {
  try {
    await invoke('save_frontmost_app');
    await showWindowCore();
  } catch (error) {
    console.error('Failed to show window:', error);
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
  } catch (error) {
    console.error('Failed to toggle window:', error);
  } finally {
    toggleInFlight = false;
  }
}

export async function hideWindow() {
  try {
    await hideWindowCore();
  } catch (error) {
    console.error('Failed to hide window:', error);
  }
}

export async function hideAndPaste() {
  try {
    await hideWindowCore();
    await invoke('simulate_paste');
  } catch (error) {
    console.error('Failed to hide and paste:', error);
  }
}

// Optimized version: clipboard write and window hide happen in parallel
export async function hideWriteAndPaste(writeToClipboard: () => Promise<void>) {
  try {
    const clipboardPromise = writeToClipboard();
    await hideWindowCore();
    await clipboardPromise;
    await invoke('simulate_paste');
  } catch (error) {
    console.error('Failed to hide, write and paste:', error);
  }
}

// Hide window then paste (clipboard already written)
export async function hideAndSimulatePaste() {
  try {
    await hideWindowCore();
    await invoke('simulate_paste');
  } catch (error) {
    console.error('Failed to hide and paste:', error);
  }
}
