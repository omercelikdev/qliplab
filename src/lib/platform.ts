export function isMac(): boolean {
  return navigator.platform.toUpperCase().includes('MAC');
}

/** Linux has no native OCR backend (Vision is macOS, Windows.Media.Ocr is
 *  Windows), so OCR-dependent affordances hide themselves here. */
export function isLinux(): boolean {
  return navigator.platform.toUpperCase().includes('LINUX');
}

export function getModifierKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

export function getAltKey(): string {
  return isMac() ? '⌥' : 'Alt';
}

/** Width of the Windows/Linux caption close button. */
export const CAPTION_BUTTON_WIDTH = 46;

/** Horizontal breathing room at the end of the top bars (Tailwind `px-3`). */
const BAR_END_PADDING = 12;

/**
 * Space the top bars must leave free at their trailing edge.
 *
 * macOS summons this panel like Spotlight and draws no window controls, so the
 * bars stop at their normal padding. Windows and Linux get a caption close
 * button in the corner and both bars have to clear it — which is also what
 * keeps the search field and the app filter sharing one right edge everywhere.
 */
export function barEndInset(): number {
  return BAR_END_PADDING + (isMac() ? 0 : CAPTION_BUTTON_WIDTH);
}
