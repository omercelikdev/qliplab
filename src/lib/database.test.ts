import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import { buildWhereClause } from './database';

const base = { formatFilter: 'all' as const, searchQuery: '' };

describe('buildWhereClause', () => {
  it('produces no WHERE clause when nothing is filtered', () => {
    const { where, args } = buildWhereClause(base);
    expect(where).toBe('');
    expect(args).toEqual([]);
  });

  it('filters pinned items', () => {
    const { where } = buildWhereClause({ ...base, formatFilter: 'pinned' });
    expect(where).toContain('is_pinned = 1');
  });

  it('filters by format group with placeholders, never inlined values', () => {
    const { where, args } = buildWhereClause({ ...base, formatFilter: 'code' });
    expect(where).toMatch(/detected_format IN \(\?(,\?)*\)/);
    expect(args.length).toBeGreaterThan(0);
    expect(where).not.toContain('code_js'); // value lives in args, not SQL
  });

  it('negates the categorized set for "other"', () => {
    const { where, args } = buildWhereClause({ ...base, formatFilter: 'other' });
    expect(where).toMatch(/detected_format NOT IN \(\?(,\?)*\)/);
    expect(args.length).toBeGreaterThan(0);
  });

  describe('source app filter', () => {
    it('adds a parameterized equality on source_app', () => {
      const { where, args } = buildWhereClause({ ...base, sourceApp: 'Visual Studio Code' });
      expect(where).toBe('WHERE source_app = ?');
      expect(args).toEqual(['Visual Studio Code']);
    });

    it('is ignored when null or empty (means "every app")', () => {
      expect(buildWhereClause({ ...base, sourceApp: null }).where).toBe('');
      expect(buildWhereClause({ ...base, sourceApp: '' }).where).toBe('');
    });
  });

  describe('tag filter', () => {
    // Regression: the tag filter used to run client-side over the loaded page
    // only. It's now an EXISTS so a tagged clip past page 1 still matches.
    it('adds an EXISTS over item_tags', () => {
      const { where, args } = buildWhereClause({ ...base, tagId: 'tag-1' });
      expect(where).toBe(
        'WHERE EXISTS (SELECT 1 FROM item_tags WHERE item_id = clipboard_history.id AND tag_id = ?)',
      );
      expect(args).toEqual(['tag-1']);
    });

    it('is ignored when null (means "every tag")', () => {
      expect(buildWhereClause({ ...base, tagId: null }).where).toBe('');
    });

    it('composes with source app and format in argument order', () => {
      const { where, args } = buildWhereClause({
        ...base,
        formatFilter: 'code',
        sourceApp: 'Code',
        tagId: 'tag-9',
      });
      expect(where).toContain('detected_format IN');
      expect(where).toContain('source_app = ?');
      expect(where).toContain('EXISTS (SELECT 1 FROM item_tags');
      // format args, then source app, then tag — the order conditions were pushed.
      expect(args[args.length - 2]).toBe('Code');
      expect(args[args.length - 1]).toBe('tag-9');
    });

    it('composes with the format filter and search, in argument order', () => {
      const { where, args } = buildWhereClause({
        formatFilter: 'pinned',
        searchQuery: 'hello',
        sourceApp: 'Terminal',
      });
      expect(where).toContain('is_pinned = 1');
      expect(where).toContain('source_app = ?');
      expect(where).toContain('content LIKE ?');
      // Args must line up with the '?' order: source app precedes the search term.
      expect(args).toEqual(['Terminal', '%hello%']);
    });
  });

  describe('search', () => {
    it('escapes LIKE wildcards so they match literally', () => {
      const { args } = buildWhereClause({ ...base, searchQuery: '100%_off' });
      expect(args).toEqual(['%100\\%\\_off%']);
    });

    it('excludes image rows from text search', () => {
      const { where } = buildWhereClause({ ...base, searchQuery: 'x' });
      expect(where).toContain("content_type != 'image'");
    });

    it('never inlines the query into the SQL', () => {
      const { where } = buildWhereClause({ ...base, searchQuery: "'; DROP TABLE clipboard_history;--" });
      expect(where).not.toContain('DROP TABLE');
    });

    // Regression: a single LIKE '%select users%' required the words to be
    // adjacent, so it never matched "SELECT id FROM users".
    it('requires every token, in any order', () => {
      const { where, args } = buildWhereClause({ ...base, searchQuery: 'select users' });
      expect(where.match(/content LIKE \?/g)).toHaveLength(2);
      expect(args).toEqual(['%select%', '%users%']);
    });

    it('adds the image exclusion once, not per token', () => {
      const { where } = buildWhereClause({ ...base, searchQuery: 'a b c' });
      expect(where.match(/content_type != 'image'/g)).toHaveLength(1);
    });

    it('ignores a whitespace-only query', () => {
      const { where, args } = buildWhereClause({ ...base, searchQuery: '   ' });
      expect(where).toBe('');
      expect(args).toEqual([]);
    });

    it('keeps source app before the search tokens in the arg list', () => {
      const { args } = buildWhereClause({ ...base, sourceApp: 'Terminal', searchQuery: 'from users' });
      expect(args).toEqual(['Terminal', '%from%', '%users%']);
    });
  });
});
