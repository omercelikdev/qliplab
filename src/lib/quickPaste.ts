/**
 * Quick-paste: Cmd+1…9 (macOS) / Ctrl+1…9 (Windows, Linux) pastes the Nth clip
 * without arrowing to it. Ditto, Raycast and Paste all bind this, and it is the
 * fastest path from "summon the window" to "content is in my editor".
 */

export const QUICK_PASTE_MAX = 9;

export interface QuickPasteEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * Zero-based index of the clip the shortcut refers to, or null when the event
 * is not a quick-paste chord.
 *
 * The digit row is safe to bind even while the search field has focus: the
 * platform modifier means no character is being typed.
 */
export function quickPasteIndex(e: QuickPasteEvent, isMac: boolean): number | null {
  const platformModifier = isMac ? e.metaKey : e.ctrlKey;
  if (!platformModifier) return null;

  // Cmd+Shift+1 and Cmd+Alt+1 belong to other bindings (and to the OS).
  if (e.shiftKey || e.altKey) return null;
  // On macOS Ctrl+1 is not ours, and on Windows Meta+1 is a Windows shortcut.
  if (isMac ? e.ctrlKey : e.metaKey) return null;

  if (e.key.length !== 1 || e.key < '1' || e.key > '9') return null;
  return Number(e.key) - 1;
}
