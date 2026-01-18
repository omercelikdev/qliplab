import { usePreviewStore } from '@/stores/previewStore';
import { computeDiff, DiffResult } from '@/lib/diff';
import { cn } from '@/lib/utils';

export function DiffView() {
  const { diffItems } = usePreviewStore();
  const [left, right] = diffItems;

  if (!left || !right) {
    return (
      <div className="text-muted-foreground text-xs">
        Select two items to compare
      </div>
    );
  }

  const diffResults = computeDiff(left.content, right.content);

  return (
    <div className="space-y-0 text-xs">
      {diffResults.map((result, index) => (
        <DiffLine key={index} result={result} />
      ))}
    </div>
  );
}

function DiffLine({ result }: { result: DiffResult }) {
  return (
    <div className={cn(
      'flex font-mono',
      result.type === 'equal' && 'bg-transparent',
      result.type === 'insert' && 'bg-green-500/10',
      result.type === 'delete' && 'bg-red-500/10',
      result.type === 'replace' && 'bg-yellow-500/10',
    )}>
      {/* Left side */}
      <div className={cn(
        'flex-1 px-2 py-0.5 border-r border-border overflow-hidden',
        result.type === 'insert' && 'opacity-30'
      )}>
        <span className="text-muted-foreground mr-2 select-none w-4 inline-block text-right">
          {result.leftLine || ' '}
        </span>
        <span className={cn(
          result.type === 'delete' && 'text-red-500',
          result.type === 'replace' && 'text-yellow-600',
        )}>{result.left}</span>
      </div>

      {/* Right side */}
      <div className={cn(
        'flex-1 px-2 py-0.5 overflow-hidden',
        result.type === 'delete' && 'opacity-30'
      )}>
        <span className="text-muted-foreground mr-2 select-none w-4 inline-block text-right">
          {result.rightLine || ' '}
        </span>
        <span className={cn(
          result.type === 'insert' && 'text-green-500',
          result.type === 'replace' && 'text-yellow-600',
        )}>{result.right}</span>
      </div>
    </div>
  );
}
