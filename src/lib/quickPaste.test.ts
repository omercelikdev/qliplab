import { describe, it, expect } from 'vitest';
import { quickPasteIndex, QUICK_PASTE_MAX, type QuickPasteEvent } from './quickPaste';

const ev = (over: Partial<QuickPasteEvent>): QuickPasteEvent => ({
  key: '1',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...over,
});

describe('quickPasteIndex on macOS', () => {
  const mac = true;

  it('maps Cmd+1..9 to zero-based indices', () => {
    for (let n = 1; n <= QUICK_PASTE_MAX; n++) {
      expect(quickPasteIndex(ev({ key: String(n), metaKey: true }), mac)).toBe(n - 1);
    }
  });

  it('ignores Ctrl+1 (that is the Windows chord, not ours)', () => {
    expect(quickPasteIndex(ev({ key: '1', ctrlKey: true }), mac)).toBeNull();
  });

  it('ignores Cmd+Ctrl+1', () => {
    expect(quickPasteIndex(ev({ key: '1', metaKey: true, ctrlKey: true }), mac)).toBeNull();
  });
});

describe('quickPasteIndex on Windows and Linux', () => {
  const mac = false;

  it('maps Ctrl+1..9 to zero-based indices', () => {
    expect(quickPasteIndex(ev({ key: '3', ctrlKey: true }), mac)).toBe(2);
    expect(quickPasteIndex(ev({ key: '9', ctrlKey: true }), mac)).toBe(8);
  });

  it('ignores Cmd/Meta+1 (a Windows OS shortcut)', () => {
    expect(quickPasteIndex(ev({ key: '1', metaKey: true }), mac)).toBeNull();
  });
});

describe('quickPasteIndex rejects everything else', () => {
  it('requires the platform modifier', () => {
    expect(quickPasteIndex(ev({ key: '1' }), true)).toBeNull();
    expect(quickPasteIndex(ev({ key: '1' }), false)).toBeNull();
  });

  it('leaves Shift and Alt chords to other bindings', () => {
    expect(quickPasteIndex(ev({ key: '1', metaKey: true, shiftKey: true }), true)).toBeNull();
    expect(quickPasteIndex(ev({ key: '1', metaKey: true, altKey: true }), true)).toBeNull();
  });

  it('ignores 0 and non-digit keys', () => {
    expect(quickPasteIndex(ev({ key: '0', metaKey: true }), true)).toBeNull();
    expect(quickPasteIndex(ev({ key: 'a', metaKey: true }), true)).toBeNull();
    expect(quickPasteIndex(ev({ key: 'Enter', metaKey: true }), true)).toBeNull();
    expect(quickPasteIndex(ev({ key: 'F1', metaKey: true }), true)).toBeNull();
  });
});
