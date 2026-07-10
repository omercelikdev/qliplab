import { describe, it, expect } from 'vitest';
import { codeToShortcutToken, shortcutNeedsModifier } from './shortcutKeys';

describe('codeToShortcutToken', () => {
  it('strips the Key/Digit prefix', () => {
    expect(codeToShortcutToken('KeyV')).toBe('V');
    expect(codeToShortcutToken('Digit1')).toBe('1');
  });

  // The whole reason this exists: on a Turkish keyboard the " key is physically
  // Quote, and the parser only accepts ' — never ".
  it('maps punctuation to parser-accepted symbols', () => {
    expect(codeToShortcutToken('Backquote')).toBe('`');
    expect(codeToShortcutToken('Quote')).toBe("'");
    expect(codeToShortcutToken('Minus')).toBe('-');
    expect(codeToShortcutToken('Slash')).toBe('/');
  });

  it('passes named and function keys through', () => {
    expect(codeToShortcutToken('Space')).toBe('Space');
    expect(codeToShortcutToken('ArrowUp')).toBe('ArrowUp');
    expect(codeToShortcutToken('F5')).toBe('F5');
  });

  it('rejects modifier and unknown keys', () => {
    expect(codeToShortcutToken('ControlLeft')).toBeNull();
    expect(codeToShortcutToken('ShiftRight')).toBeNull();
    expect(codeToShortcutToken('MetaLeft')).toBeNull();
    expect(codeToShortcutToken('F13')).toBeNull();
    expect(codeToShortcutToken('Lang1')).toBeNull();
  });
});

describe('shortcutNeedsModifier', () => {
  it('requires a modifier for character keys', () => {
    expect(shortcutNeedsModifier('V')).toBe(true);
    expect(shortcutNeedsModifier('`')).toBe(true);
    expect(shortcutNeedsModifier("'")).toBe(true);
  });

  it('lets function keys stand alone', () => {
    expect(shortcutNeedsModifier('F8')).toBe(false);
    expect(shortcutNeedsModifier('F12')).toBe(false);
  });
});
