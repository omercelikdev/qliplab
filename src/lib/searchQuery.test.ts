import { describe, it, expect } from 'vitest';
import {
  tokenizeSearchQuery,
  escapeLikePattern,
  highlightRanges,
  MAX_SEARCH_TOKENS,
  MAX_TOKEN_LENGTH,
} from './searchQuery';

describe('tokenizeSearchQuery', () => {
  it('splits on whitespace', () => {
    expect(tokenizeSearchQuery('select users')).toEqual(['select', 'users']);
  });

  it('collapses runs of whitespace, tabs and newlines', () => {
    expect(tokenizeSearchQuery('  select \t\n  users  ')).toEqual(['select', 'users']);
  });

  it('returns an empty list for blank input', () => {
    expect(tokenizeSearchQuery('')).toEqual([]);
    expect(tokenizeSearchQuery('   ')).toEqual([]);
  });

  it('keeps a single term intact', () => {
    expect(tokenizeSearchQuery('SELECT')).toEqual(['SELECT']);
  });

  it('drops duplicate terms case-insensitively', () => {
    expect(tokenizeSearchQuery('user User USER id')).toEqual(['user', 'id']);
  });

  it('caps the number of tokens', () => {
    const many = Array.from({ length: MAX_SEARCH_TOKENS + 4 }, (_, i) => `t${i}`).join(' ');
    expect(tokenizeSearchQuery(many)).toHaveLength(MAX_SEARCH_TOKENS);
  });

  it('truncates absurdly long tokens', () => {
    const [token] = tokenizeSearchQuery('x'.repeat(MAX_TOKEN_LENGTH + 50));
    expect(token).toHaveLength(MAX_TOKEN_LENGTH);
  });
});

describe('escapeLikePattern', () => {
  it('escapes LIKE wildcards so they match literally', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('user_name')).toBe('user\\_name');
  });

  it('escapes the escape character itself', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeLikePattern('SELECT id')).toBe('SELECT id');
  });
});

describe('highlightRanges', () => {
  it('returns nothing without tokens', () => {
    expect(highlightRanges('SELECT id FROM users', [])).toEqual([]);
  });

  it('finds a single token case-insensitively', () => {
    expect(highlightRanges('SELECT id', ['select'])).toEqual([{ start: 0, end: 6 }]);
  });

  // Regression: the preview searched for the raw query as one substring, so a
  // multi-word search highlighted nothing even though it matched the row.
  it('highlights every token of a multi-word query', () => {
    const text = 'SELECT id FROM users';
    expect(highlightRanges(text, ['select', 'users'])).toEqual([
      { start: 0, end: 6 },
      { start: 15, end: 20 },
    ]);
  });

  it('highlights repeated occurrences of a token', () => {
    expect(highlightRanges('id, id', ['id'])).toEqual([
      { start: 0, end: 2 },
      { start: 4, end: 6 },
    ]);
  });

  it('merges overlapping matches instead of nesting them', () => {
    expect(highlightRanges('username', ['user', 'username'])).toEqual([{ start: 0, end: 8 }]);
  });

  it('merges adjacent matches', () => {
    expect(highlightRanges('foobar', ['foo', 'bar'])).toEqual([{ start: 0, end: 6 }]);
  });

  it('returns ranges in ascending order regardless of token order', () => {
    const ranges = highlightRanges('SELECT id FROM users', ['users', 'select']);
    expect(ranges.map((r) => r.start)).toEqual([0, 15]);
  });

  it('returns nothing when no token appears', () => {
    expect(highlightRanges('SELECT id', ['zzz'])).toEqual([]);
  });

  // Regression: 'İ'.toLowerCase() is two code units, so indices computed on the
  // lowercased copy no longer line up with the original — bail rather than
  // highlight the wrong span. (Turkish content is a shipped locale.)
  it('does not return misaligned ranges for length-changing lowercasing', () => {
    // 'İ' → 'i̇' (i + combining dot), so the lowercased string is longer.
    const text = 'İSTANBUL kodu';
    expect(highlightRanges(text, ['kodu'])).toEqual([]);
  });

  it('still highlights normally when lowercasing preserves length', () => {
    expect(highlightRanges('Ömer KODU', ['kodu'])).toEqual([{ start: 5, end: 9 }]);
  });
});
