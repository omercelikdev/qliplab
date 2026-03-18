import { describe, it, expect } from 'vitest';
import { fuzzyScore, fuzzyFilter } from './fuzzySearch';

// ─── Test 11: Fuzzy Search ───────────────────────────────────

describe('fuzzyScore', () => {
  it('returns 0 for empty query', () => {
    expect(fuzzyScore('', 'anything')).toBe(0);
  });

  it('returns -1 for no match', () => {
    expect(fuzzyScore('xyz', 'hello')).toBe(-1);
  });

  it('scores exact start match highest', () => {
    const score = fuzzyScore('hel', 'hello world');
    expect(score).toBeGreaterThan(10000);
  });

  it('scores word boundary match second', () => {
    const score = fuzzyScore('world', 'hello world');
    expect(score).toBeGreaterThan(9000);
    expect(score).toBeLessThan(10000);
  });

  it('scores substring match third', () => {
    const score = fuzzyScore('llo', 'hello');
    expect(score).toBeGreaterThan(8000);
    expect(score).toBeLessThan(9000);
  });

  it('returns -1 for non-contiguous characters', () => {
    // Substring-only matching — 'hlo' is not a contiguous substring of 'hello'
    const score = fuzzyScore('hlo', 'hello');
    expect(score).toBe(-1);
  });

  it('is case insensitive', () => {
    expect(fuzzyScore('HELLO', 'hello world')).toBeGreaterThan(10000);
  });

  it('gives higher score to consecutive matches', () => {
    const consecutive = fuzzyScore('ab', 'abc');
    const spread = fuzzyScore('ac', 'abc');
    expect(consecutive).toBeGreaterThan(spread);
  });
});

describe('fuzzyFilter', () => {
  const items = [
    { id: 1, text: 'Hello World' },
    { id: 2, text: 'foo bar' },
    { id: 3, text: 'hello there' },
    { id: 4, text: 'xyz' },
  ];

  it('returns all items for empty query', () => {
    const result = fuzzyFilter(items, '', (i) => i.text);
    expect(result).toHaveLength(4);
  });

  it('filters and sorts by relevance', () => {
    const result = fuzzyFilter(items, 'hello', (i) => i.text);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('Hello World'); // Exact start match
    expect(result[1].text).toBe('hello there');
  });

  it('returns empty for no matches', () => {
    const result = fuzzyFilter(items, 'zzzzz', (i) => i.text);
    expect(result).toHaveLength(0);
  });

  it('returns empty for non-substring queries', () => {
    // 'hlw' is not a contiguous substring in any item
    const result = fuzzyFilter(items, 'hlw', (i) => i.text);
    expect(result).toHaveLength(0);
  });
});
