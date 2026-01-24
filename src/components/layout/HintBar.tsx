import { useState } from 'react';
import { GitCompareArrows, ArrowUp, ArrowDown, CornerDownLeft, Settings } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { cn } from '@/lib/utils';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-surface border border-border/50 rounded text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function HintBar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isDiffMode = useAppStore((state) => state.isDiffMode);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const setDiffMode = useAppStore((state) => state.setDiffMode);
  const clearDiffSelection = useAppStore((state) => state.clearDiffSelection);
  const { isOpen: previewOpen, close: closePreview } = usePreviewStore();

  const handleDiffClick = () => {
    // If any panel is open, close it and enter diff selection mode
    if (previewOpen) {
      closePreview();
      if (!isDiffMode) {
        setDiffMode(true);
      }
      return;
    }

    // No panel open - toggle diff selection mode
    if (isDiffMode) {
      setDiffMode(false);
      clearDiffSelection();
    } else {
      setDiffMode(true);
    }
  };

  if (isDiffMode) {
    return (
      <div className={cn('h-9 flex items-center justify-center gap-4 px-3', 'border-t border-border/50 text-xs bg-accent/10')}>
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
    <>
      <div className={cn('h-9 flex items-center justify-between px-3', 'border-t border-border/50 text-xs text-muted-foreground')}>
        {/* Left: Navigation hints */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Kbd><ArrowUp className="w-2.5 h-2.5" /></Kbd>
            <Kbd><ArrowDown className="w-2.5 h-2.5" /></Kbd>
            <span className="ml-1">navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <Kbd><CornerDownLeft className="w-2.5 h-2.5" /></Kbd>
            <span className="ml-1">paste</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
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
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              'p-1.5 rounded-md',
              'hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer'
            )}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
