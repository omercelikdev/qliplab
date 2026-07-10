/**
 * Should losing focus dismiss the panel?
 *
 * A summoned panel is expected to get out of the way the moment you click
 * elsewhere — Spotlight, Raycast and the Windows Win+V flyout all behave this
 * way. The traps are the cases where focus leaves for a reason that is *part of*
 * using the panel, and hiding would abort the very action in progress.
 */
export interface FocusChange {
  /** Payload of Tauri's onFocusChanged. */
  focused: boolean;
  /** A hidden window still emits focus events; never act on those. */
  isVisible: boolean;
  /** Guards the burst of events around showing the panel. */
  hasFocusedOnce: boolean;
  /** Dragging a clip into another app necessarily takes focus away. */
  isDraggingOut: boolean;
  /** `document.activeElement?.tagName`. A native <select> popup is its own
   *  window, so opening the app filter reads as focus loss. */
  activeElementTag: string | null;
}

export function shouldHideOnFocusChange(change: FocusChange): boolean {
  if (change.focused) return false;
  if (!change.hasFocusedOnce) return false;
  if (!change.isVisible) return false;
  if (change.isDraggingOut) return false;
  if (change.activeElementTag === 'SELECT') return false;
  return true;
}
