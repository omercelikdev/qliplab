import { useEffect, useRef, useCallback, Suspense, lazy, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, ClipboardPaste, Columns2, Rows2, GitCompare } from 'lucide-react';
import { usePreviewStore, getMonacoLanguage } from '@/stores/previewStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { EditorView } from './EditorView';
import { FormatIcon } from '@/components/history/FormatIcon';
import { getFormatDisplayName } from '@/lib/formatDetector';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideAndPaste } from '@/lib/window';
import { cn } from '@/lib/utils';

const MonacoDiffEditor = lazy(() =>
  import('@monaco-editor/react').then((mod) => ({ default: mod.DiffEditor }))
);

export function PreviewPanel() {
  const { isOpen, mode, editedContent, transformType, sourceItem, diffItems, diffViewMode, setDiffViewMode, close } = usePreviewStore();
  const { settings } = useSettingsStore();
  const panelRef = useRef<HTMLDivElement>(null);

  const [left, right] = diffItems;
  const isDiffMode = mode === 'diff';
  const hasDiffItems = Boolean(left && right);

  // All hooks must be called before any early return
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-menu]') || target.closest('button')) {
        return;
      }
      close();
    }
  }, [close]);

  const handleCopy = useCallback(async () => {
    await writeText(editedContent);
  }, [editedContent]);

  const handlePaste = useCallback(async () => {
    await writeText(editedContent);
    close();
    await hideAndPaste();
  }, [editedContent, close]);

  const theme = settings.theme === 'dark' ? 'vs-dark' : 'light';

  const diffLanguage = useMemo(() => {
    if (left) return getMonacoLanguage(left.detectedFormat);
    if (right) return getMonacoLanguage(right.detectedFormat);
    return 'plaintext';
  }, [left, right]);

  const diffOptions = useMemo(() => ({
    readOnly: true,
    minimap: { enabled: false },
    fontSize: 11,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    wordWrap: 'off' as const,
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    lineNumbersMinChars: 3,
    renderSideBySide: diffViewMode === 'side-by-side',
    glyphMargin: false,
    folding: false,
    scrollbar: {
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
  }), [diffViewMode]);

  useEffect(() => {
    if (isOpen && !isDiffMode) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, isDiffMode, handleClickOutside]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  const getTitle = () => {
    if (mode === 'diff') {
      if (left && right) {
        const leftName = getFormatDisplayName(left.detectedFormat);
        const rightName = getFormatDisplayName(right.detectedFormat);
        return leftName === rightName ? leftName : `${leftName} vs ${rightName}`;
      }
      return 'Compare';
    }
    if (mode === 'view') {
      return sourceItem ? getFormatDisplayName(sourceItem.detectedFormat) : 'View';
    }
    return transformType;
  };

  const getModeLabel = () => {
    if (mode === 'diff') return 'Diff';
    return mode === 'view' ? 'View' : 'Transform';
  };

  const panelKey = isDiffMode
    ? `diff-${left?.id || 'none'}-${right?.id || 'none'}`
    : `${mode}-${sourceItem?.id || 'none'}-${transformType}`;

  return (
    <motion.div
      ref={panelRef}
      key={panelKey}
      initial={{ opacity: 0, flex: 0 }}
      animate={{ opacity: 1, flex: 1 }}
      exit={{ opacity: 0, flex: 0 }}
      transition={{ duration: 0.15 }}
      className="h-full border-l border-border flex flex-col bg-background overflow-hidden"
    >
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-border/50 bg-surface/30">
        <div className="flex items-center gap-2">
          {isDiffMode ? (
            <GitCompare className="w-4 h-4 text-muted-foreground" />
          ) : sourceItem && (
            <FormatIcon format={sourceItem.detectedFormat} size={14} />
          )}
          <span className="text-xs font-medium truncate">{getTitle()}</span>
          <span className="text-[10px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
            {getModeLabel()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Diff View Mode Toggle */}
          {isDiffMode && (
            <div className="flex items-center bg-surface rounded-md p-0.5">
              <button
                onClick={() => setDiffViewMode('side-by-side')}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1',
                  diffViewMode === 'side-by-side'
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-surface-hover text-muted-foreground'
                )}
              >
                <Columns2 className="w-3 h-3" />
                Side
              </button>
              <button
                onClick={() => setDiffViewMode('inline')}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1',
                  diffViewMode === 'inline'
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-surface-hover text-muted-foreground'
                )}
              >
                <Rows2 className="w-3 h-3" />
                Inline
              </button>
            </div>
          )}

          <button
            onClick={close}
            className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {isDiffMode ? (
          hasDiffItems && left && right ? (
            <Suspense fallback={<DiffSkeleton />}>
              <MonacoDiffEditor
                key={`${panelKey}-${diffViewMode}`}
                height="100%"
                language={diffLanguage}
                original={left.content || ''}
                modified={right.content || ''}
                theme={theme}
                options={diffOptions}
                loading={<DiffSkeleton />}
              />
            </Suspense>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select two items to compare
            </div>
          )
        ) : (
          <EditorView />
        )}
      </div>

      {/* Footer - only for view/transform mode */}
      {!isDiffMode && (
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

function DiffSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-surface/50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading diff view...</span>
      </div>
    </div>
  );
}
