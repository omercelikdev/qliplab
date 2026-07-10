import { useState, useEffect } from 'react';
import { isMac } from '@/lib/platform';

/**
 * True while the quick-paste modifier (Cmd on macOS, Ctrl elsewhere) is held.
 *
 * Lets the list reveal its ⌘1…⌘9 hints exactly when the user is about to use
 * them, then hide them again — no permanent clutter. A window blur resets the
 * flag so the hint can't get stuck lit if focus leaves mid-press.
 */
export function useModifierHeld(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const modifierKey = isMac() ? 'Meta' : 'Control';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === modifierKey) setHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === modifierKey) setHeld(false);
    };
    const reset = () => setHeld(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', reset);
    };
  }, []);

  return held;
}
