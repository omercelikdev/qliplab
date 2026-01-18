import { getCurrentWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

const DEFAULT_WIDTH = 420;
const PREVIEW_WIDTH = 840;
const DEFAULT_HEIGHT = 450;

export async function expandWindowForPreview() {
  try {
    const window = getCurrentWindow();
    const position = await window.outerPosition();

    // Keep height fixed, only expand width
    await window.setSize(new LogicalSize(PREVIEW_WIDTH, DEFAULT_HEIGHT));
    // Restore position immediately to prevent jumping
    await window.setPosition(new LogicalPosition(position.x, position.y));
  } catch (error) {
    console.error('Failed to expand window:', error);
  }
}

export async function shrinkWindowFromPreview() {
  try {
    const window = getCurrentWindow();
    const position = await window.outerPosition();

    // Keep height fixed, only shrink width
    await window.setSize(new LogicalSize(DEFAULT_WIDTH, DEFAULT_HEIGHT));
    // Restore position immediately to prevent jumping
    await window.setPosition(new LogicalPosition(position.x, position.y));
  } catch (error) {
    console.error('Failed to shrink window:', error);
  }
}

export async function hideWindow() {
  try {
    const window = getCurrentWindow();
    await window.hide();
  } catch (error) {
    console.error('Failed to hide window:', error);
  }
}

export async function showWindow() {
  try {
    // Save the frontmost app BEFORE showing our window
    await invoke('save_frontmost_app');
    const window = getCurrentWindow();
    await window.show();
    await window.setFocus();
  } catch (error) {
    console.error('Failed to show window:', error);
  }
}

export async function toggleWindow() {
  try {
    const window = getCurrentWindow();
    const visible = await window.isVisible();
    if (visible) {
      await window.hide();
    } else {
      // Save the frontmost app BEFORE showing our window
      await invoke('save_frontmost_app');
      await window.show();
      await window.setFocus();
    }
  } catch (error) {
    console.error('Failed to toggle window:', error);
  }
}

export async function hideAndPaste() {
  try {
    const window = getCurrentWindow();
    // First hide our window
    await window.hide();
    // Then invoke paste simulation (it activates the previous app and pastes)
    await invoke('simulate_paste');
  } catch (error) {
    console.error('Failed to hide and paste:', error);
  }
}
