// Lightweight fuzzy search — matches characters in order, not necessarily adjacent.
// Returns a score (higher = better match) or -1 if no match.
// Exact substring matches are scored highest to preserve existing behavior.

export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Empty query matches everything
  if (q.length === 0) return 0;

  // Exact substring match gets highest priority
  const substringIndex = t.indexOf(q);
  if (substringIndex !== -1) {
    // Bonus for matching at start of string or at word boundary
    if (substringIndex === 0) return 10000 + q.length;
    if (t[substringIndex - 1] === ' ' || t[substringIndex - 1] === '/' || t[substringIndex - 1] === '.') {
      return 9000 + q.length;
    }
    return 8000 + q.length;
  }

  // Fuzzy matching: characters must appear in order
  let qi = 0;
  let score = 0;
  let lastMatchIndex = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Consecutive matches score higher
      if (lastMatchIndex === ti - 1) {
        score += 3;
      } else {
        score += 1;
      }

      // Word boundary bonus
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '/' || t[ti - 1] === '.' || t[ti - 1] === '-' || t[ti - 1] === '_') {
        score += 2;
      }

      lastMatchIndex = ti;
      qi++;
    }
  }

  // All query characters must be found
  if (qi < q.length) return -1;

  return score;
}

// Filter and sort items by fuzzy match. Returns items sorted by relevance.
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
