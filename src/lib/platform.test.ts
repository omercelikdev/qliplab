import { describe, it, expect, afterEach } from 'vitest';
import { isMac, getModifierKey, getAltKey, barEndInset, CAPTION_BUTTON_WIDTH } from './platform';

const original = navigator.platform;

function setPlatform(value: string) {
  Object.defineProperty(navigator, 'platform', { value, configurable: true });
}

afterEach(() => setPlatform(original));

describe('isMac', () => {
  it('recognises macOS regardless of case', () => {
    setPlatform('MacIntel');
    expect(isMac()).toBe(true);
    setPlatform('macintel');
    expect(isMac()).toBe(true);
  });

  it('rejects other platforms', () => {
    setPlatform('Win32');
    expect(isMac()).toBe(false);
    setPlatform('Linux x86_64');
    expect(isMac()).toBe(false);
  });
});

describe('getModifierKey / getAltKey', () => {
  it('uses the mac glyphs on macOS', () => {
    setPlatform('MacIntel');
    expect(getModifierKey()).toBe('⌘');
    expect(getAltKey()).toBe('⌥');
  });

  it('spells the keys out elsewhere', () => {
    setPlatform('Win32');
    expect(getModifierKey()).toBe('Ctrl');
    expect(getAltKey()).toBe('Alt');
  });
});

describe('barEndInset', () => {
  // macOS draws no caption button, so the bars keep their plain padding.
  it('is just the bar padding on macOS', () => {
    setPlatform('MacIntel');
    expect(barEndInset()).toBe(12);
  });

  // Windows and Linux must clear the caption close button, and both top bars
  // use this same value so their trailing edges cannot drift apart.
  it('clears the caption button on Windows and Linux', () => {
    setPlatform('Win32');
    expect(barEndInset()).toBe(12 + CAPTION_BUTTON_WIDTH);
    setPlatform('Linux x86_64');
    expect(barEndInset()).toBe(12 + CAPTION_BUTTON_WIDTH);
  });
});
