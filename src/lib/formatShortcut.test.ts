import { describe, it, expect } from 'vitest';
import { formatShortcut } from './formatShortcut';

describe('formatShortcut', () => {
  it('renders CommandOrControl as Cmd on macOS', () => {
    expect(formatShortcut('CommandOrControl+Shift+V', true)).toBe('Cmd + Shift + V');
  });
  it('renders CommandOrControl as Ctrl off macOS', () => {
    expect(formatShortcut('CommandOrControl+Shift+V', false)).toBe('Ctrl + Shift + V');
  });
  it('maps Alt to Option on macOS', () => {
    expect(formatShortcut('Alt+Q', true)).toBe('Option + Q');
  });
  it('keeps Alt as Alt off macOS', () => {
    expect(formatShortcut('Alt+Q', false)).toBe('Alt + Q');
  });
  it('renders the backquote key symbol', () => {
    expect(formatShortcut('Control+Backquote', false)).toBe('Ctrl + `');
    expect(formatShortcut('Control+Backquote', true)).toBe('Control + `');
  });
  it('returns empty string for an empty shortcut', () => {
    expect(formatShortcut('', true)).toBe('');
  });
});
