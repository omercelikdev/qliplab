import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, ClipboardPaste, GitCompare } from 'lucide-react';
import { usePreviewStore } from '@/stores/previewStore';
import { EditorView } from './EditorView';
import { MonacoDiffView } from './MonacoDiffView';
import { FormatIcon } from '@/components/history/FormatIcon';
import { getFormatDisplayName } from '@/lib/formatDetector';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideAndPaste } from '@/lib/window';
import { cn } from '@/lib/utils';

export function PreviewPanel() {
  const { isOpen, mode, editedContent, transformType, sourceItem, diffItems, close } = usePreviewStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      // Don't close if clicking on menu items or buttons
      const target = e.target as HTMLElement;
      if (target.closest('[data-menu]') || target.closest('button')) {
        return;
      }
      close();
    }
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      // Delay to avoid immediate close from the opening click
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, handleClickOutside]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await writeText(editedContent);
  };

  const handlePaste = async () => {
    await writeText(editedContent);
    close();
    await hideAndPaste();
  };

  const getTitle = () => {
    switch (mode) {
      case 'view':
        return sourceItem ? getFormatDisplayName(sourceItem.detectedFormat) : 'View';
      case 'transform':
        return transformType;
      case 'diff': {
        const [left, right] = diffItems;
        if (left && right) {
          const leftName = getFormatDisplayName(left.detectedFormat);
          const rightName = getFormatDisplayName(right.detectedFormat);
          return leftName === rightName ? leftName : `${leftName} vs ${rightName}`;
        }
        return 'Compare';
      }
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'view':
        return 'View';
      case 'transform':
        return 'Transform';
      case 'diff':
        return 'Diff';
    }
  };

  // Unique key for the panel to ensure proper re-render
  const panelKey = `${mode}-${sourceItem?.id || 'none'}-${transformType}`;

  return (
    <motion.div
      ref={panelRef}
      key={panelKey}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 500, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="h-full border-l border-border flex flex-col shrink-0 bg-background"
    >
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-border/50 bg-surface/30">
        <div className="flex items-center gap-2">
          {/* Format Icon */}
          {sourceItem && mode !== 'diff' && (
            <FormatIcon format={sourceItem.detectedFormat} size={14} />
          )}
          {mode === 'diff' && <GitCompare className="w-3.5 h-3.5 text-muted-foreground" />}

          {/* Title */}
          <span className="text-xs font-medium truncate">{getTitle()}</span>

          {/* Mode Badge */}
          <span className="text-[10px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
            {getModeLabel()}
          </span>
        </div>
        <button
          onClick={close}
          className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'diff' ? <MonacoDiffView /> : <EditorView />}
      </div>

      {/* Footer */}
      {mode !== 'diff' && (
        <div className="h-10 flex items-center justify-between px-3 border-t border-border/50 bg-surface/30">
          <span className="text-[10px] text-muted-foreground">
            Editable
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs cursor-pointer',
                'bg-surface hover:bg-surface-hover rounded-md transition-colors'
              )}
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
            <button
              onClick={handlePaste}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs cursor-pointer',
                'bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors'
              )}
            >
              <ClipboardPaste className="w-3 h-3" /> Paste
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
