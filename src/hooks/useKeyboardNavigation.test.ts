import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// The hook reads isMac from navigator.platform at module load; jsdom reports
// '' → isMac is false, so the delete modifier is Ctrl in this suite.
vi.mock('@/stores/previewStore', () => ({
  usePreviewStore: (sel: (s: { isOpen: boolean }) => unknown) => sel({ isOpen: false }),
}));
vi.mock('@/stores/appStore', () => ({
  useAppStore: (sel: (s: { windowOpenCount: number }) => unknown) => sel({ windowOpenCount: 0 }),
}));

import { useKeyboardNavigation } from './useKeyboardNavigation';

function press(key: string, mods: Partial<KeyboardEventInit> = {}) {
  // Dispatch on body so it bubbles to the window listener with a real element
  // target (the hook inspects e.target.tagName / data-search-input).
  act(() => {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods }),
    );
  });
}

describe('useKeyboardNavigation', () => {
  let onSelect: Mock<(index: number, opts?: { plain?: boolean }) => void>;
  let onDelete: Mock<(index: number) => void>;
  let onEdit: Mock<(index: number) => void>;

  beforeEach(() => {
    onSelect = vi.fn();
    onDelete = vi.fn();
    onEdit = vi.fn();
  });

  const setup = () =>
    renderHook(() =>
      useKeyboardNavigation({ itemCount: 5, onSelect, onDelete, onEdit, isActive: true }),
    );

  it('Enter selects the highlighted row with plain:false', () => {
    setup();
    press('Enter');
    expect(onSelect).toHaveBeenCalledWith(0, { plain: false });
  });

  it('Shift+Enter selects with plain:true', () => {
    setup();
    press('Enter', { shiftKey: true });
    expect(onSelect).toHaveBeenCalledWith(0, { plain: true });
  });

  it('arrows move the selection before Enter fires', () => {
    setup();
    press('ArrowDown');
    press('ArrowDown');
    press('Enter');
    expect(onSelect).toHaveBeenLastCalledWith(2, { plain: false });
  });

  it('Ctrl+Backspace deletes the highlighted row', () => {
    setup();
    press('ArrowDown');
    press('Backspace', { ctrlKey: true });
    expect(onDelete).toHaveBeenCalledWith(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Ctrl+E edits the highlighted row', () => {
    setup();
    press('ArrowDown');
    press('e', { ctrlKey: true });
    expect(onEdit).toHaveBeenCalledWith(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('a plain "e" does not edit (so typing in search is safe)', () => {
    setup();
    press('e');
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('a plain Backspace does not delete (so typing in search is safe)', () => {
    setup();
    press('Backspace');
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('does nothing while inactive', () => {
    renderHook(() =>
      useKeyboardNavigation({ itemCount: 5, onSelect, onDelete, isActive: false }),
    );
    press('Enter');
    press('Backspace', { ctrlKey: true });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
