import { GitCompareArrows, ListOrdered, CornerDownLeft } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { startPasteQueue } from '@/lib/window';
import { cn } from '@/lib/utils';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[3px] bg-surface border border-border/40 rounded-[3px] text-[10px] font-mono font-medium text-foreground/40 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
      {children}
    </kbd>
  );
}

export function HintBar() {
  const activeTab = useAppStore((state) => state.activeTab);
  const isDiffMode = useAppStore((state) => state.isDiffMode);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const setDiffMode = useAppStore((state) => state.setDiffMode);
  const clearDiffSelection = useAppStore((state) => state.clearDiffSelection);
  const isQueueMode = useAppStore((state) => state.isQueueMode);
  const pasteQueue = useAppStore((state) => state.pasteQueue);
  const setQueueMode = useAppStore((state) => state.setQueueMode);
  const cancelQueue = useAppStore((state) => state.cancelQueue);
  const { isOpen: previewOpen, close: closePreview } = usePreviewStore();

  const handleDiffClick = () => {
    if (previewOpen) {
      closePreview();
      if (!isDiffMode) {
        setDiffMode(true);
      }
      return;
    }
    if (isDiffMode) {
      setDiffMode(false);
      clearDiffSelection();
    } else {
      setDiffMode(true);
    }
  };

  const handleQueueClick = () => {
    if (previewOpen) closePreview();
    if (isQueueMode) {
      cancelQueue();
    } else {
      setQueueMode(true);
    }
  };

  // Queue selection mode
  if (isQueueMode) {
    return (
      <div role="status" aria-live="polite" className={cn('h-9 flex items-center justify-center gap-4 px-3', 'elevation-top text-xs bg-accent/10')}>
        <span className="text-accent font-medium">Queue Mode</span>
        <span className="text-muted-foreground">
          {pasteQueue.length === 0
            ? 'Click items to add to queue'
            : `${pasteQueue.length} item${pasteQueue.length > 1 ? 's' : ''} selected`}
        </span>
        {pasteQueue.length > 0 && (
          <button
            onClick={() => startPasteQueue()}
            className="flex items-center gap-1 px-2 py-0.5 bg-accent text-accent-foreground rounded transition-colors cursor-pointer"
          >
            <CornerDownLeft className="w-2.5 h-2.5" />
            <span>Start</span>
          </button>
        )}
        <button
          onClick={() => cancelQueue()}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Kbd>ESC</Kbd>
          <span>cancel</span>
        </button>
      </div>
    );
  }

  // Diff selection mode
  if (isDiffMode) {
    return (
      <div role="status" aria-live="polite" className={cn('h-9 flex items-center justify-center gap-4 px-3', 'elevation-top text-xs bg-accent/10')}>
        <span className="text-accent font-medium">Diff Mode</span>
        <span className="text-muted-foreground">
          {diffSelectedIds.length === 0 && 'Select first item'}
          {diffSelectedIds.length === 1 && 'Select second item'}
        </span>
        <button
          onClick={handleDiffClick}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Kbd>ESC</Kbd>
          <span>cancel</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('h-9 flex items-center justify-between px-3', 'elevation-top text-xs text-foreground/35')}>
      {/* Left: Navigation hints */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Kbd>j</Kbd>
          <Kbd>k</Kbd>
          <span className="ml-1">nav</span>
        </div>
        <div className="flex items-center gap-1">
          <Kbd><CornerDownLeft className="w-2.5 h-2.5" /></Kbd>
          <span className="ml-1">paste</span>
        </div>
        <div className="flex items-center gap-1">
          <Kbd>/</Kbd>
          <span className="ml-1">search</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {activeTab === 'history' && (
          <button
            onClick={handleQueueClick}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md',
              'hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer'
            )}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Queue</span>
          </button>
        )}
        <button
          onClick={handleDiffClick}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md',
            'hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer'
          )}
        >
          <GitCompareArrows className="w-3.5 h-3.5" />
          <span>Diff</span>
          <Kbd>⌥D</Kbd>
        </button>
      </div>
    </div>
  );
}
