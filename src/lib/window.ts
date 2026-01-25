import { getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 450;
const PREVIEW_WIDTH = 1300;
const PREVIEW_HEIGHT = 700;

export async function expandWindowForPreview() {
  try {
    const window = getCurrentWindow();
    const monitor = await currentMonitor();

    const scaleFactor = monitor?.scaleFactor || 2;
    const screenWidth = (monitor?.size?.width || 1920) / scaleFactor;
    const screenHeight = (monitor?.size?.height || 1080) / scaleFactor;

    const centerX = Math.round((screenWidth - PREVIEW_WIDTH) / 2);
    const centerY = Math.round((screenHeight - PREVIEW_HEIGHT) / 2);

    await window.setSize(new LogicalSize(PREVIEW_WIDTH, PREVIEW_HEIGHT));
    await window.setPosition(new LogicalPosition(Math.max(0, centerX), Math.max(0, centerY)));
  } catch (error) {
    console.error('Failed to expand window:', error);
  }
}

export async function shrinkWindowFromPreview() {
  try {
    const window = getCurrentWindow();
    const monitor = await currentMonitor();

    const scaleFactor = monitor?.scaleFactor || 2;
    const screenWidth = (monitor?.size?.width || 1920) / scaleFactor;
    const screenHeight = (monitor?.size?.height || 1080) / scaleFactor;

    // Center the shrunk window
    const centerX = Math.round((screenWidth - DEFAULT_WIDTH) / 2);
    const centerY = Math.round((screenHeight - DEFAULT_HEIGHT) / 2);

    await window.setSize(new LogicalSize(DEFAULT_WIDTH, DEFAULT_HEIGHT));
    await window.setPosition(new LogicalPosition(Math.max(0, centerX), Math.max(0, centerY)));
  } catch (error) {
    console.error('Failed to shrink window:', error);
  }
}

export async function hideWindow() {
  try {
    await invoke('hide_panel');
    const window = getCurrentWindow();
    await window.hide();
  } catch (error) {
    console.error('Failed to hide window:', error);
  }
}

export async function showWindow() {
  try {
    await invoke('save_frontmost_app');
    // Use panel on macOS for Spotlight-like behavior
    await invoke('show_panel');
    const window = getCurrentWindow();
    await window.show();
    // Focus may fail if OS denies it - window is still visible
    try { await window.setFocus(); } catch { /* User can click to focus */ }
  } catch (error) {
    console.error('Failed to show window:', error);
  }
}

export async function toggleWindow() {
  try {
    const window = getCurrentWindow();
    const visible = await window.isVisible();
    if (visible) {
      // Blur before hiding so focus won't be restored on reopen
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      await invoke('hide_panel');
      await window.hide();
    } else {
      await invoke('save_frontmost_app');
      await invoke('show_panel');
      await window.show();
      // Focus may fail if OS denies it - window is still visible
      try { await window.setFocus(); } catch { /* User can click to focus */ }
    }
  } catch (error) {
    console.error('Failed to toggle window:', error);
  }
}

export async function hideAndPaste() {
  try {
    await invoke('hide_panel');
    const window = getCurrentWindow();
    await window.hide();
    await invoke('simulate_paste');
  } catch (error) {
    console.error('Failed to hide and paste:', error);
  }
}

// Optimized version: clipboard write and window hide happen in parallel
export async function hideWriteAndPaste(writeToClipboard: () => Promise<void>) {
  try {
    // 1. Start clipboard write immediately (don't wait)
    const clipboardPromise = writeToClipboard();

    // 2. Hide window in parallel
    const window = getCurrentWindow();
    await Promise.all([
      invoke('hide_panel'),
      window.hide(),
    ]);

    // 3. Wait for clipboard write to complete (if not already)
    await clipboardPromise;

    // 4. Simulate paste
    await invoke('simulate_paste');
  } catch (error) {
    console.error('Failed to hide, write and paste:', error);
  }
}

// Hide window then paste (clipboard already written)
export async function hideAndSimulatePaste() {
  try {
    const window = getCurrentWindow();
    await invoke('hide_panel');
    await window.hide();
    await invoke('simulate_paste');
  } catch (error) {
    console.error('Failed to hide and paste:', error);
  }
}
