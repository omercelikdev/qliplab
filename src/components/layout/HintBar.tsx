import { useTranslation } from 'react-i18next';
import { GitCompareArrows, ListOrdered, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { startPasteQueue } from '@/lib/window';
import { cn } from '@/lib/utils';

// Windows/Linux have no ⌥ key — showing the Mac glyph there is just noise.
const isMac = navigator.platform.toUpperCase().includes('MAC');

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[3px] bg-surface border border-border/40 rounded-[3px] text-[10px] font-mono font-medium text-foreground/55 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
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
  const { t } = useTranslation();

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
        <span className="text-accent font-medium">{t('hintBar.queueMode')}</span>
        <span className="text-muted-foreground">
          {pasteQueue.length === 0
            ? t('hintBar.clickToAddToQueue')
            : t('hintBar.itemsSelected', { count: pasteQueue.length })}
        </span>
        {pasteQueue.length > 0 && (
          <button
            onClick={() => startPasteQueue()}
            className="flex items-center gap-1 px-2 py-0.5 bg-accent text-accent-foreground rounded transition-colors cursor-pointer"
          >
            <CornerDownLeft className="w-2.5 h-2.5" />
            <span>{t('hintBar.start')}</span>
          </button>
        )}
        <button
          onClick={() => cancelQueue()}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Kbd>ESC</Kbd>
          <span>{t('hintBar.cancel')}</span>
        </button>
      </div>
    );
  }

  // Diff selection mode
  if (isDiffMode) {
    return (
      <div role="status" aria-live="polite" className={cn('h-9 flex items-center justify-center gap-4 px-3', 'elevation-top text-xs bg-accent/10')}>
        <span className="text-accent font-medium">{t('hintBar.diffMode')}</span>
        <span className="text-muted-foreground">
          {diffSelectedIds.length === 0 && t('hintBar.selectFirstItem')}
          {diffSelectedIds.length === 1 && t('hintBar.selectSecondItem')}
        </span>
        <button
          onClick={handleDiffClick}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Kbd>ESC</Kbd>
          <span>{t('hintBar.cancel')}</span>
        </button>
      </div>
    );
  }

  return (
    <div data-tauri-drag-region className={cn('h-9 flex items-center justify-between px-3 cursor-move drag-region', 'elevation-top text-xs text-foreground/50')}>
      {/* Left: Navigation hints */}
      <div className="flex items-center gap-3 no-drag">
        <div className="flex items-center gap-1">
          <Kbd><ArrowUp className="w-2.5 h-2.5" /></Kbd>
          <Kbd><ArrowDown className="w-2.5 h-2.5" /></Kbd>
          <span className="ms-1">{t('hintBar.nav')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Kbd><CornerDownLeft className="w-2.5 h-2.5" /></Kbd>
          <span className="ms-1">{t('hintBar.paste')}</span>
        </div>
        {activeTab === 'history' && (
          <div className="flex items-center gap-1">
            <Kbd>{isMac ? '⌘1–9' : 'Ctrl+1–9'}</Kbd>
            <span className="ms-1">{t('hintBar.quickPaste')}</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 no-drag">
        {activeTab === 'history' && (
          <button
            onClick={handleQueueClick}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md',
              'hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer'
            )}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>{t('hintBar.queue')}</span>
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
          <span>{t('hintBar.diff')}</span>
          <Kbd>{isMac ? '⌥D' : 'Alt+D'}</Kbd>
        </button>
      </div>
    </div>
  );
}
