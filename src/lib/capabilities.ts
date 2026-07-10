import { invoke } from '@tauri-apps/api/core';

/**
 * Platform capabilities the UI must not assume.
 *
 * The ignored-apps list compares each copy against the frontmost app's name.
 * On a Wayland session (or X11 without xdotool/xprop) that name is unknowable,
 * so the list silently matches nothing — a user who excluded their password
 * manager would still be capturing from it. Ask, and say so.
 */
export async function isFrontmostAppSupported(): Promise<boolean> {
  try {
    return (await invoke<boolean>('frontmost_app_supported')) === true;
  } catch {
    // Command missing (older build): assume it works rather than raise a
    // warning the user cannot act on.
    return true;
  }
}
