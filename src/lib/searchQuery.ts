/**
 * History search is a single `content LIKE '%query%'` over SQLite, so a query
 * like "select users" never matches "SELECT id FROM users" — the words have to
 * be adjacent. Splitting the query into tokens and requiring each one lets the
 * search behave the way people actually type it, while staying a plain
 * parameterized LIKE that works over a million rows.
 */

/** More tokens than this and the query is noise; each extra one costs a scan. */
export const MAX_SEARCH_TOKENS = 6;
/** SQLite has a parameter-length limit and long tokens never match anything. */
export const MAX_TOKEN_LENGTH = 100;

/**
 * Split a raw search box value into the terms a row must contain (in any order).
 * Returns an empty array when nothing is searchable.
 */
export function tokenizeSearchQuery(query: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const raw of query.trim().split(/\s+/)) {
    if (!raw) continue;
    const token = raw.slice(0, MAX_TOKEN_LENGTH);
    const key = token.toLowerCase();
    if (seen.has(key)) continue; // "the the" must not double the work
    seen.add(key);
    tokens.push(token);
    if (tokens.length === MAX_SEARCH_TOKENS) break;
  }

  return tokens;
}

/** Escape LIKE wildcards so a literal % or _ in the query matches itself. */
export function escapeLikePattern(token: string): string {
  return token.replace(/[%_\\]/g, '\\$&');
}

export interface HighlightRange {
  start: number;
  /** Exclusive. */
  end: number;
}

/**
 * Where each search token occurs in `text`, merged into non-overlapping ranges.
 *
 * The row preview must highlight the same words the query matched on. Looking
 * for the raw query as one substring would highlight nothing for a multi-word
 * search, even though that search is exactly what surfaced the row.
 */
export function highlightRanges(text: string, tokens: string[]): HighlightRange[] {
  if (tokens.length === 0) return [];

  const haystack = text.toLowerCase();
  // toLowerCase can change length (Turkish 'İ' → 'i̇', German 'ß' unchanged but
  // 'İ' adds a combining mark), which desyncs indices from the original text and
  // highlights the wrong spans. A missed highlight beats a wrong one — bail.
  if (haystack.length !== text.length) return [];
  const found: HighlightRange[] = [];

  for (const token of tokens) {
    const needle = token.toLowerCase();
    if (!needle) continue;
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) break;
      found.push({ start: at, end: at + needle.length });
      from = at + needle.length; // non-overlapping occurrences of the same token
    }
  }

  if (found.length === 0) return [];
  found.sort((a, b) => a.start - b.start || a.end - b.end);

  // Merge overlaps so "user" and "username" don't produce nested <mark>s.
  const merged: HighlightRange[] = [found[0]];
  for (const range of found.slice(1)) {
    const last = merged[merged.length - 1];
    if (range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push(range);
    }
  }
  return merged;
}
