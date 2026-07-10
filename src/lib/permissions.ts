import { invoke } from '@tauri-apps/api/core';

/**
 * macOS Accessibility permission.
 *
 * Auto-paste (`simulate_paste`) and snippet auto-expand both post synthetic
 * keyboard events, which macOS gates behind Accessibility. Without it the app
 * looks broken: the window closes and nothing is pasted, triggers never fire.
 * Windows and Linux need no such grant and always report granted.
 */

/** Whether the app may post synthetic keyboard events. */
export async function isAccessibilityGranted(): Promise<boolean> {
  try {
    return (await invoke<boolean>('accessibility_granted')) === true;
  } catch {
    // If we cannot ask, assume granted rather than nag the user with a banner
    // they cannot act on.
    return true;
  }
}

/** Trigger the macOS permission dialog. Resolves to the state after asking. */
export async function requestAccessibilityPermission(): Promise<boolean> {
  try {
    return await invoke<boolean>('request_accessibility_permission');
  } catch {
    return false;
  }
}

/** Open the macOS Accessibility settings pane. */
export async function openAccessibilitySettings(): Promise<void> {
  try {
    await invoke('open_accessibility_settings');
  } catch {
    // Best effort — the banner still tells the user where to go.
  }
}
