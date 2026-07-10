import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModifierHeld } from './useModifierHeld';

const originalPlatform = navigator.platform;
function setPlatform(value: string) {
  Object.defineProperty(navigator, 'platform', { value, configurable: true });
}
afterEach(() => setPlatform(originalPlatform));

function dispatch(type: 'keydown' | 'keyup', key: string) {
  act(() => window.dispatchEvent(new KeyboardEvent(type, { key })));
}

describe('useModifierHeld', () => {
  it('starts false', () => {
    setPlatform('MacIntel');
    const { result } = renderHook(() => useModifierHeld());
    expect(result.current).toBe(false);
  });

  it('follows Cmd down and up on macOS', () => {
    setPlatform('MacIntel');
    const { result } = renderHook(() => useModifierHeld());
    dispatch('keydown', 'Meta');
    expect(result.current).toBe(true);
    dispatch('keyup', 'Meta');
    expect(result.current).toBe(false);
  });

  it('follows Ctrl off macOS, ignoring Cmd there', () => {
    setPlatform('Win32');
    const { result } = renderHook(() => useModifierHeld());
    dispatch('keydown', 'Meta');
    expect(result.current).toBe(false);
    dispatch('keydown', 'Control');
    expect(result.current).toBe(true);
  });

  it('ignores ordinary keys', () => {
    setPlatform('MacIntel');
    const { result } = renderHook(() => useModifierHeld());
    dispatch('keydown', 'a');
    expect(result.current).toBe(false);
  });

  // Releasing the modifier outside the window never delivers a keyup, so a blur
  // has to clear the flag or the hints would stay lit.
  it('resets when the window loses focus', () => {
    setPlatform('MacIntel');
    const { result } = renderHook(() => useModifierHeld());
    dispatch('keydown', 'Meta');
    expect(result.current).toBe(true);
    act(() => window.dispatchEvent(new Event('blur')));
    expect(result.current).toBe(false);
  });
});
