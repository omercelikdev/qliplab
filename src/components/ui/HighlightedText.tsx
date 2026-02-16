import { useMemo } from 'react';
import { fuzzyMatchPositions } from '@/lib/fuzzySearch';

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

export function HighlightedText({ text, query, className }: HighlightedTextProps) {
  const parts = useMemo(() => {
    if (!query) return null;
    const positions = new Set(fuzzyMatchPositions(query, text));
    if (positions.size === 0) return null;

    const result: { text: string; highlighted: boolean }[] = [];
    let current = '';
    let isHighlighted = positions.has(0);

    for (let i = 0; i < text.length; i++) {
      const matched = positions.has(i);
      if (matched !== isHighlighted) {
        if (current) result.push({ text: current, highlighted: isHighlighted });
        current = '';
        isHighlighted = matched;
      }
      current += text[i];
    }
    if (current) result.push({ text: current, highlighted: isHighlighted });
    return result;
  }, [text, query]);

  if (!parts) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlighted ? (
          <mark key={i} className="bg-accent/30 text-foreground rounded-sm">{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}
