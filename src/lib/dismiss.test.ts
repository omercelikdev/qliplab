import { describe, it, expect } from 'vitest';
import { shouldHideOnFocusChange, type FocusChange } from './dismiss';

/** A visible, settled panel that just lost focus to another app. */
const blurred = (over: Partial<FocusChange> = {}): FocusChange => ({
  focused: false,
  isVisible: true,
  hasFocusedOnce: true,
  isDraggingOut: false,
  activeElementTag: 'BODY',
  ...over,
});

describe('shouldHideOnFocusChange', () => {
  it('hides when the user clicks away to another app', () => {
    expect(shouldHideOnFocusChange(blurred())).toBe(true);
  });

  it('stays open when the panel gains focus', () => {
    expect(shouldHideOnFocusChange(blurred({ focused: true }))).toBe(false);
  });

  // Showing the panel emits its own focus traffic. Acting before the first
  // focus:true would hide the window the instant it is summoned.
  it('ignores focus loss before the panel has ever been focused', () => {
    expect(shouldHideOnFocusChange(blurred({ hasFocusedOnce: false }))).toBe(false);
  });

  it('ignores focus loss while already hidden', () => {
    expect(shouldHideOnFocusChange(blurred({ isVisible: false }))).toBe(false);
  });

  // Dragging a clip into another app hands focus to that app by definition.
  // Hiding mid-drag would cancel the drop the user is making.
  it('stays open while a clip is being dragged out', () => {
    expect(shouldHideOnFocusChange(blurred({ isDraggingOut: true }))).toBe(false);
  });

  // The "All apps" filter is a native <select>; its popup is a separate window,
  // so opening it looks exactly like clicking away.
  it('stays open while a native select popup is up', () => {
    expect(shouldHideOnFocusChange(blurred({ activeElementTag: 'SELECT' }))).toBe(false);
  });

  it('still hides when focus sits on an ordinary input', () => {
    expect(shouldHideOnFocusChange(blurred({ activeElementTag: 'INPUT' }))).toBe(true);
  });
});
