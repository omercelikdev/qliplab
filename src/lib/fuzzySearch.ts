// Despite the name, scoring is substring-only: a query that is not a contiguous
// substring of the target scores -1 and the item is dropped. The word-initial
// fallback below exists solely for highlighting, never for matching.
//
// Ranking, highest first: match at the start, then at a word boundary, then
// anywhere. Used for snippets and vault items, which are small enough to score
// in memory. Clipboard history is filtered in SQL instead (see searchQuery.ts).

export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (q.length === 0) return 0;

  // 1) Exact substring match — highest priority
  const substringIndex = t.indexOf(q);
  if (substringIndex !== -1) {
    if (substringIndex === 0) return 10000 + q.length;
    const prev = t[substringIndex - 1];
    if (prev === ' ' || prev === '/' || prev === '.' || prev === '\n') {
      return 9000 + q.length;
    }
    return 8000 + q.length;
  }

  // No match
  return -1;
}

// Returns indices of matched characters in target for highlighting.
export function fuzzyMatchPositions(query: string, target: string): number[] {
  if (!query) return [];
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Substring match → highlight contiguous range
  const substringIndex = t.indexOf(q);
  if (substringIndex !== -1) {
    return Array.from({ length: q.length }, (_, i) => substringIndex + i);
  }

  // Word-initial match
  const positions: number[] = [];
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi] && (ti === 0 || /[\s/._\-]/.test(t[ti - 1]))) {
      positions.push(ti);
      qi++;
    }
  }
  return qi === q.length ? positions : [];
}

// Filter and sort items by match score. Returns matched items sorted by relevance.
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  if (!query) return items;

  const scored = items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter(({ score }) => score >= 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ item }) => item);
}
