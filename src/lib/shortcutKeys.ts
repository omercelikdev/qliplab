/**
 * Turn a KeyboardEvent.code (the physical key, layout-independent) into a token
 * the global-shortcut parser accepts.
 *
 * The recorder must key off the physical position, not the typed character:
 * on a Turkish keyboard the top-left key types `"` but is physically Backquote,
 * and the parser only accepts `` ` ``/`Backquote`, never `"`. Binding by code
 * also means the shortcut fires on that key regardless of layout or Shift.
 *
 * Returns null for keys that cannot anchor a shortcut (modifier keys, anything
 * outside the parser's vocabulary).
 */
const PUNCTUATION: Record<string, string> = {
  Backquote: '`',
  Quote: "'",
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Comma: ',',
  Period: '.',
  Slash: '/',
};

// Non-printable keys the parser recognises by their W3C code name (uppercased).
const NAMED_KEYS = new Set([
  'Space', 'Enter', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export function codeToShortcutToken(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];

  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];

  if (code in PUNCTUATION) return PUNCTUATION[code];
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  if (NAMED_KEYS.has(code)) return code;

  return null;
}

/**
 * A shortcut whose key types a character needs a Ctrl/Cmd/Alt modifier, or it
 * would fire every time the user types that character (Shift alone isn't enough
 * — Shift+" is just how you type "). Function keys stand alone.
 */
export function shortcutNeedsModifier(token: string): boolean {
  return !/^F([1-9]|1[0-2])$/.test(token);
}
