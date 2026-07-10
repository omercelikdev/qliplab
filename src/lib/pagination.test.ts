import { describe, it, expect } from 'vitest';
import { PAGE_SIZE, refreshWindowLimit, offsetAfterDelete } from './pagination';

describe('refreshWindowLimit', () => {
  it('returns a full page when nothing extra is loaded', () => {
    expect(refreshWindowLimit(0)).toBe(PAGE_SIZE);
    expect(refreshWindowLimit(PAGE_SIZE)).toBe(PAGE_SIZE);
  });

  // Regression: a copy used to reload with LIMIT 50, collapsing an expanded list.
  it('preserves an expanded list instead of collapsing it to one page', () => {
    expect(refreshWindowLimit(200)).toBe(200);
    expect(refreshWindowLimit(51)).toBe(51);
  });

  it('never returns less than one page', () => {
    expect(refreshWindowLimit(-10)).toBe(PAGE_SIZE);
    expect(refreshWindowLimit(NaN)).toBe(PAGE_SIZE);
  });

  it('honours a custom page size', () => {
    expect(refreshWindowLimit(10, 25)).toBe(25);
    expect(refreshWindowLimit(80, 25)).toBe(80);
  });
});

describe('offsetAfterDelete', () => {
  // Regression: offset stayed put after a delete, so the next page skipped a row.
  it('decrements the offset when the removed row was loaded', () => {
    expect(offsetAfterDelete(50, true)).toBe(49);
    expect(offsetAfterDelete(1, true)).toBe(0);
  });

  it('never goes below zero', () => {
    expect(offsetAfterDelete(0, true)).toBe(0);
  });

  it('leaves the offset alone when the removed row was outside the window', () => {
    expect(offsetAfterDelete(50, false)).toBe(50);
  });
});
