import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clampListWidth,
  loadListWidth,
  saveListWidth,
  LIST_WIDTH_MIN,
  LIST_WIDTH_MAX,
  LIST_WIDTH_DEFAULT,
} from './listWidth';

const KEY = 'qlip_listWidth';

describe('clampListWidth', () => {
  it('keeps a value inside the bounds untouched (rounded)', () => {
    expect(clampListWidth(320.4)).toBe(320);
  });
  it('clamps below the minimum up', () => {
    expect(clampListWidth(50)).toBe(LIST_WIDTH_MIN);
  });
  it('clamps above the maximum down', () => {
    expect(clampListWidth(9000)).toBe(LIST_WIDTH_MAX);
  });
  it('falls back to default for non-finite input', () => {
    expect(clampListWidth(NaN)).toBe(LIST_WIDTH_DEFAULT);
    expect(clampListWidth(Infinity)).toBe(LIST_WIDTH_DEFAULT);
  });
});

describe('load/saveListWidth', () => {
  beforeEach(() => localStorage.clear());

  it('returns the default when nothing is stored', () => {
    expect(loadListWidth()).toBe(LIST_WIDTH_DEFAULT);
  });

  it('round-trips a saved width', () => {
    saveListWidth(360);
    expect(loadListWidth()).toBe(360);
  });

  it('clamps an out-of-range stored value on the way out', () => {
    localStorage.setItem(KEY, '10000');
    expect(loadListWidth()).toBe(LIST_WIDTH_MAX);
  });

  it('clamps on the way in too', () => {
    saveListWidth(10);
    expect(localStorage.getItem(KEY)).toBe(String(LIST_WIDTH_MIN));
  });

  it('ignores a corrupted stored value', () => {
    localStorage.setItem(KEY, 'not-a-number');
    expect(loadListWidth()).toBe(LIST_WIDTH_DEFAULT);
  });

  it('survives localStorage throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveListWidth(300)).not.toThrow();
    spy.mockRestore();
  });
});
