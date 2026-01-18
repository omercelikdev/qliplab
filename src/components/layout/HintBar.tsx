import { GitCompareArrows } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

export function HintBar() {
  const isDiffMode = useAppStore((state) => state.isDiffMode);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const setDiffMode = useAppStore((state) => state.setDiffMode);
  const clearDiffSelection = useAppStore((state) => state.clearDiffSelection);

  const handleDiffClick = () => {
    if (isDiffMode) {
      setDiffMode(false);
      clearDiffSelection();
    } else {
      setDiffMode(true);
    }
  };

  if (isDiffMode) {
    return (
      <div className={cn('h-8 flex items-center justify-center gap-4 px-3', 'border-t border-border/50 text-xs bg-accent/10')}>
        <span className="text-accent font-medium">Diff Mode</span>
        <span className="text-muted-foreground">
          {diffSelectedIds.length === 0 && 'Select first item'}
          {diffSelectedIds.length === 1 && 'Select second item'}
        </span>
        <button
          onClick={handleDiffClick}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ESC: cancel
        </button>
      </div>
    );
  }

  return (
    <div className={cn('h-8 flex items-center justify-between px-3', 'border-t border-border/50 text-xs text-muted-foreground')}>
      <span>Click: paste</span>
      <button
        onClick={handleDiffClick}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded',
          'hover:bg-surface-hover hover:text-foreground transition-colors'
        )}
      >
        <GitCompareArrows className="w-3.5 h-3.5" />
        <span>Diff</span>
        <kbd className="ml-1 px-1 py-0.5 bg-surface rounded text-[10px]">⌥D</kbd>
      </button>
    </div>
  );
}
