export interface DiffResult {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  left: string;
  right: string;
  leftLine?: number;
  rightLine?: number;
}

export function computeDiff(left: string, right: string): DiffResult[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const results: DiffResult[] = [];

  let i = 0, j = 0;

  while (i < leftLines.length || j < rightLines.length) {
    if (i >= leftLines.length) {
      results.push({ type: 'insert', left: '', right: rightLines[j], rightLine: j + 1 });
      j++;
    } else if (j >= rightLines.length) {
      results.push({ type: 'delete', left: leftLines[i], right: '', leftLine: i + 1 });
      i++;
    } else if (leftLines[i] === rightLines[j]) {
      results.push({ type: 'equal', left: leftLines[i], right: rightLines[j], leftLine: i + 1, rightLine: j + 1 });
      i++; j++;
    } else {
      results.push({ type: 'replace', left: leftLines[i], right: rightLines[j], leftLine: i + 1, rightLine: j + 1 });
      i++; j++;
    }
  }

  return results;
}
