import { useRef, useCallback, useEffect, Suspense, lazy, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Copy, ClipboardPaste, Columns2, Rows2, GitCompare, Image as ImageIcon, Code, Eye, Plus, ChevronRight, Search, Lock, Unlock, Sparkles, ArrowRightLeft, Hash, CaseSensitive, AlignLeft, Clock, Star, Save } from 'lucide-react';
import { usePreviewStore, getMonacoLanguage } from '@/stores/previewStore';
import type { PipelineStep } from '@/stores/previewStore';
import { getTransformById, buildTransformGroups, flattenGroups } from '@/lib/transformRegistry';
import { getRecentTransformIds, pushRecentTransform } from '@/lib/recentTransforms';
import { useSettingsStore } from '@/stores/settingsStore';
import { EditorView } from './EditorView';
import { ImageView } from './ImageView';
import { FormatIcon } from '@/components/history/FormatIcon';
import { getFormatDisplayName, detectFormat } from '@/lib/formatDetector';
import { writeImage } from '@tauri-apps/plugin-clipboard-manager';
import { writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { Image } from '@tauri-apps/api/image';
import { hideWriteAndPaste } from '@/lib/window';
import { renderMarkdown } from '@/lib/markdownRenderer';
import DOMPurify from 'dompurify';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useHistoryStore } from '@/stores/historyStore';
import { cn } from '@/lib/utils';

const MonacoDiffEditor = lazy(() =>
  import('@monaco-editor/react').then((mod) => ({ default: mod.DiffEditor }))
);

export function PreviewPanel() {
  const { t } = useTranslation();
  const { isOpen, mode, editedContent, transformType, sourceItem, diffItems, diffViewMode, setDiffViewMode, pipelineSteps, addPipelineStep, removePipelineStep, requestClose, confirmClose, cancelClose, markSaved } = usePreviewStore();
  const pendingClose = usePreviewStore((s) => s.pendingClose);
  const isDirty = mode === 'view' && !!sourceItem && sourceItem.contentType !== 'image' && editedContent !== sourceItem.content;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const handleSave = useCallback(async () => {
    if (!sourceItem || !isDirty) return;
    await useHistoryStore.getState().updateItemContent(sourceItem.id, editedContent);
    markSaved(editedContent);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }, [sourceItem, isDirty, editedContent, markSaved]);
  const { settings } = useSettingsStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [showTransformPicker, setShowTransformPicker] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  const [left, right] = diffItems;
  const isDiffMode = mode === 'diff';
  const hasDiffItems = Boolean(left && right);
  const hasHtmlContent = sourceItem?.htmlContent && !isDiffMode;
  const isMarkdown = sourceItem?.detectedFormat === 'markdown' && !isDiffMode;
  const canRenderPreview = (hasHtmlContent || isMarkdown) && mode === 'view';

  // Panel closes only via X button, ESC, or Option+D - not by clicking outside

  // Memoize parsed image data to avoid duplicate JSON.parse in copy/paste
  const parsedImageData = useMemo(() => {
    if (sourceItem?.contentType !== 'image') return null;
    try {
      const data = JSON.parse(sourceItem.content);
      if (data.type === 'rgba' && data.data && data.width && data.height) return data;
      return null;
    } catch {
      return null;
    }
  }, [sourceItem]);

  const writeImageToClipboard = useCallback(async () => {
    if (!parsedImageData) return;
    const binary = atob(parsedImageData.data);
    const rgba = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      rgba[i] = binary.charCodeAt(i);
    }
    const img = await Image.new(rgba, parsedImageData.width, parsedImageData.height);
    await writeImage(img);
  }, [parsedImageData]);

  const handleCopy = useCallback(async () => {
    try {
      if (parsedImageData) {
        await writeImageToClipboard();
      } else if (sourceItem?.htmlContent && editedContent === sourceItem.content) {
        await writeHtmlAndText(sourceItem.htmlContent, editedContent);
      } else {
        // For transformed/edited content, wrap in <pre> HTML so rich text apps
        // (Teams, Slack, Word) preserve formatting (newlines, indentation)
        const html = `<pre style="font-family:monospace;white-space:pre">${editedContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
        await writeHtmlAndText(html, editedContent);
      }
      setCopyStatus('ok');
    } catch {
      setCopyStatus('fail');
    }
    setTimeout(() => setCopyStatus('idle'), 1500);
  }, [editedContent, sourceItem, parsedImageData, writeImageToClipboard]);

  const handlePaste = useCallback(async () => {
    // No close() here — hideWindowCore's resetUIState() already sets isOpen:false.
    // Calling close() would trigger shrinkWindowFromPreview() racing with hideWindowCore().
    await hideWriteAndPaste(async () => {
      if (parsedImageData) {
        try { await writeImageToClipboard(); } catch { /* image copy failed */ }
      } else if (sourceItem?.htmlContent && editedContent === sourceItem.content) {
        await writeHtmlAndText(sourceItem.htmlContent, editedContent);
      } else {
        const html = `<pre style="font-family:monospace;white-space:pre">${editedContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
        await writeHtmlAndText(html, editedContent);
      }
    });
  }, [editedContent, sourceItem, parsedImageData, writeImageToClipboard]);

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

  // Early return AFTER all hooks
  if (!isOpen) return null;

  const getTitle = () => {
    if (mode === 'diff') {
      if (left && right) {
        const leftName = getFormatDisplayName(left.detectedFormat);
        const rightName = getFormatDisplayName(right.detectedFormat);
        return leftName === rightName ? leftName : `${leftName} vs ${rightName}`;
      }
      return t('preview.compare');
    }
    if (mode === 'view') {
      if (sourceItem?.contentType === 'image') {
        return t('preview.image');
      }
      return sourceItem ? getFormatDisplayName(sourceItem.detectedFormat) : t('preview.view');
    }
    return transformType;
  };

  const isImageMode = sourceItem?.contentType === 'image';

  const getModeLabel = () => {
    if (mode === 'diff') return t('preview.diff');
    return mode === 'view' ? t('common.edit') : t('preview.transform');
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
      className="h-full border-s border-border flex flex-col bg-background overflow-hidden"
    >
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-border/50 bg-surface/30">
        <div className="flex items-center gap-2">
          {isDiffMode ? (
            <GitCompare className="w-4 h-4 text-muted-foreground" />
          ) : isImageMode ? (
            <ImageIcon className="w-4 h-4 text-blue-500" />
          ) : sourceItem && (
            <FormatIcon format={sourceItem.detectedFormat} size={14} />
          )}
          <span className="text-xs font-medium truncate">{getTitle()}</span>
          <span className="text-[10px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
            {getModeLabel()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rendered Preview Toggle (HTML / Markdown) */}
          {canRenderPreview && (
            <div className="flex items-center bg-surface rounded-md p-0.5">
              <button
                onClick={() => setShowHtmlPreview(false)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1',
                  !showHtmlPreview
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-surface-hover text-muted-foreground'
                )}
              >
                <Code className="w-3 h-3" />
                {t('preview.source')}
              </button>
              <button
                onClick={() => setShowHtmlPreview(true)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1',
                  showHtmlPreview
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-surface-hover text-muted-foreground'
                )}
              >
                <Eye className="w-3 h-3" />
                {t('preview.render')}
              </button>
            </div>
          )}

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
                {t('preview.side')}
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
                {t('preview.inline')}
              </button>
            </div>
          )}

          <button
            onClick={requestClose}
            className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
            title={t('preview.closeEsc')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pipeline Bar */}
      {!isDiffMode && (mode === 'transform' || mode === 'view') && sourceItem?.contentType !== 'image' && (
        <PipelineBar
          steps={pipelineSteps}
          detectedFormat={pipelineSteps.length > 0 ? detectFormat(editedContent) : (sourceItem?.detectedFormat ?? 'plain')}
          sourceContent={editedContent}
          canChain={true}
          onRemoveStep={removePipelineStep}
          onAddStep={async (transformId) => {
            const def = getTransformById(transformId);
            if (!def) return;
            pushRecentTransform(transformId);
            const input = editedContent;
            const output = await def.apply(input);
            addPipelineStep(transformId, def.label, output);
          }}
          showPicker={showTransformPicker}
          onTogglePicker={() => setShowTransformPicker(v => !v)}
          onClosePicker={() => setShowTransformPicker(false)}
        />
      )}

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
              {t('preview.selectTwoItems')}
            </div>
          )
        ) : showHtmlPreview && isMarkdown && sourceItem ? (
          <RenderedPreview html={renderMarkdown(sourceItem.content)} />
        ) : showHtmlPreview && sourceItem?.htmlContent ? (
          <RenderedPreview html={DOMPurify.sanitize(sourceItem.htmlContent)} />
        ) : sourceItem?.contentType === 'image' ? (
          <ImageView />
        ) : (
          <EditorView />
        )}
      </div>

      {/* Footer - only for view/transform mode */}
      {!isDiffMode && (
        <div className="h-10 flex items-center justify-between px-3 border-t border-border/50 bg-surface/30">
          <EditorStats content={editedContent} isImage={sourceItem?.contentType === 'image'} />
          <div className="flex items-center gap-1.5">
            {(isDirty || saveStatus === 'saved') && (
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors',
                  saveStatus === 'saved'
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 cursor-default'
                    : 'bg-surface hover:bg-surface-hover cursor-pointer'
                )}
                title={t('preview.saveEdit')}
              >
                <Save className="w-3.5 h-3.5" />
                {saveStatus === 'saved' ? t('preview.saved') : t('common.save')}
              </button>
            )}
            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer rounded-md transition-colors',
                copyStatus === 'ok' ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : copyStatus === 'fail' ? 'bg-destructive/10 text-destructive'
                  : 'bg-surface hover:bg-surface-hover'
              )}
              title={t('preview.copyToClipboard')}
            >
              <Copy className="w-3.5 h-3.5" />
              {copyStatus === 'ok' ? t('common.copied') : copyStatus === 'fail' ? t('common.failed') : t('common.copy')}
            </button>
            <button
              onClick={handlePaste}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer',
                'bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors'
              )}
              title={t('preview.pasteToApp')}
            >
              <ClipboardPaste className="w-3.5 h-3.5" /> {t('common.paste')}
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={pendingClose}
        title={t('preview.discardTitle')}
        message={t('preview.discardMessage')}
        confirmLabel={t('snippets.editor.discard')}
        onConfirm={confirmClose}
        onCancel={cancelClose}
      />
    </motion.div>
  );
}

function EditorStats({ content, isImage }: { content: string; isImage?: boolean }) {
  const { t } = useTranslation();

  if (isImage) {
    return <span className="text-[10px] text-muted-foreground">{t('preview.image')}</span>;
  }

  const lines = content.split('\n').length;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;

  return (
    <span className="text-[10px] text-muted-foreground">
      {t('preview.stats.lines', { count: lines })} · {t('preview.stats.words', { count: words })} · {t('preview.stats.chars', { count: chars })}
    </span>
  );
}

function PipelineBar({
  steps,
  detectedFormat,
  sourceContent,
  canChain,
  onRemoveStep,
  onAddStep,
  showPicker,
  onTogglePicker,
  onClosePicker,
}: {
  steps: PipelineStep[];
  detectedFormat: string;
  sourceContent: string;
  canChain: boolean;
  onRemoveStep: (index: number) => void;
  onAddStep: (transformId: string) => void;
  showPicker: boolean;
  onTogglePicker: () => void;
  onClosePicker: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative border-b border-border/50 bg-surface/20">
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
        {steps.length > 0 && (
          <>
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-accent/15 text-accent rounded">
                  {step.label}
                  <button
                    onClick={() => onRemoveStep(i)}
                    className="hover:text-destructive transition-colors cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              </div>
            ))}
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </>
        )}
        {(steps.length === 0 || canChain) && (
          <button
            onClick={onTogglePicker}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded transition-colors cursor-pointer shrink-0',
              showPicker
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
            )}
          >
            <Plus className="w-3 h-3" />
            {t('preview.addTransform')}
          </button>
        )}
      </div>

      {showPicker && (
        <TransformPicker
          detectedFormat={detectedFormat}
          sourceContent={sourceContent}
          onSelect={(id) => {
            onAddStep(id);
            onClosePicker();
          }}
          onClose={onClosePicker}
        />
      )}
    </div>
  );
}

/** One lucide icon per transform category, so the list is scannable at a glance
 *  the way the rest of the app's format badges are. */
const CATEGORY_ICON: Record<string, React.ElementType> = {
  Encode: Lock,
  Decode: Unlock,
  Format: Sparkles,
  Convert: ArrowRightLeft,
  Hash: Hash,
  Case: CaseSensitive,
  Text: AlignLeft,
};

/** Localized header for a group. Category keys are a technical taxonomy
 *  (Encode, Hash, …) and stay literal like the format badges elsewhere. */
function groupHeader(key: string, t: (k: string) => string): string {
  if (key === 'suggested') return t('preview.suggested');
  if (key === 'recent') return t('preview.recent');
  if (key === 'results') return '';
  return key;
}

function groupIcon(key: string): React.ElementType {
  if (key === 'recent') return Clock;
  if (key === 'suggested') return Star;
  return CATEGORY_ICON[key] ?? AlignLeft;
}

function TransformPicker({
  detectedFormat,
  sourceContent,
  onSelect,
  onClose,
}: {
  detectedFormat: string;
  sourceContent: string;
  onSelect: (transformId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use setTimeout to avoid closing immediately from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const recentIds = useMemo(() => getRecentTransformIds(), []);
  const groups = useMemo(
    () => buildTransformGroups(detectedFormat as import('@/types/clipboard').DetectedFormat, recentIds, filter),
    [detectedFormat, recentIds, filter]
  );
  // Flat order drives keyboard navigation and the active highlight.
  const flat = useMemo(() => flattenGroups(groups), [groups]);

  // Snap the highlight back to the top whenever the visible list changes.
  useEffect(() => { setActiveIndex(0); }, [filter]);
  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(Math.max(0, flat.length - 1));
  }, [flat.length, activeIndex]);

  const activeId = flat[activeIndex]?.id ?? null;

  // Live-preview the highlighted transform against the real content. Transforms
  // can be async and can throw on unsuitable input, so guard and ignore stale
  // results when the highlight moves on before this one resolves.
  useEffect(() => {
    const def = flat[activeIndex];
    if (!def) { setPreview(null); return; }
    let cancelled = false;
    setPreview(null);
    Promise.resolve()
      .then(() => def.apply(sourceContent))
      .then((out) => { if (!cancelled) setPreview(firstLine(out)); })
      .catch(() => { if (!cancelled) setPreview(null); });
    return () => { cancelled = true; };
  }, [activeId, sourceContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the highlighted row scrolled into view under keyboard control.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeId) onSelect(activeId);
    } else if (e.key === 'Escape') {
      // Escape closes only the picker; keep it from bubbling up and closing the
      // whole preview panel or the window with it.
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Running index across groups so mouse hover and keyboard share one highlight.
  let runningIndex = -1;

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 z-50 mt-1 w-[520px] max-w-[calc(100vw-24px)] rounded-xl bg-popover border border-popover-border shadow-[0_12px_40px_rgb(0_0_0/0.16)] dark:shadow-[0_12px_40px_rgb(0_0_0/0.55)] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-popover-border/70">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('preview.searchTransforms')}
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-foreground/40"
          autoFocus
        />
      </div>

      <div ref={listRef} className="max-h-[300px] overflow-y-auto p-1.5">
        {flat.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {t('preview.noTransformsMatch', { query: filter })}
          </div>
        ) : (
          groups.map((group) => {
            const GroupIcon = groupIcon(group.key);
            const header = groupHeader(group.key, t);
            return (
              <div key={group.key} className="mb-1 last:mb-0">
                {header && (
                  <div className="flex items-center gap-1 px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <GroupIcon className="w-2.5 h-2.5" />
                    {header}
                  </div>
                )}
                {group.transforms.map((tr) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const RowIcon = groupIcon(group.key === 'recent' || group.key === 'suggested' ? group.key : tr.category);
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={`${group.key}:${tr.id}`}
                      data-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => onSelect(tr.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-start transition-colors cursor-pointer',
                        isActive ? 'bg-accent/12 text-foreground' : 'text-foreground/80'
                      )}
                    >
                      <RowIcon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-accent' : 'text-muted-foreground')} />
                      <span className="truncate">{tr.label}</span>
                      <span className="ms-auto text-[9px] uppercase tracking-wide text-foreground/30 shrink-0">{tr.category}</span>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Live preview of the highlighted transform's result. */}
      {flat.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-popover-border/70 bg-foreground/[0.02]">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">{t('preview.transformResultPreview')}</span>
          <span className="flex-1 min-w-0 truncate font-mono text-[11px] text-foreground/60">
            {preview ?? '—'}
          </span>
          <span className="hidden sm:flex items-center gap-1 text-[9px] text-foreground/30 shrink-0">
            <kbd className="px-1 py-px rounded bg-foreground/[0.06] font-sans">↵</kbd>
          </span>
        </div>
      )}
    </div>
  );
}

/** First non-empty line of a transform result, trimmed for the preview strip. */
function firstLine(value: string): string {
  const line = value.split('\n').find((l) => l.trim().length > 0) ?? value;
  return line.length > 120 ? `${line.slice(0, 120)}…` : line;
}

function RenderedPreview({ html }: { html: string }) {
  return (
    <div className="h-full overflow-y-auto">
      <div
        className="markdown-body p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function DiffSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="h-full w-full flex items-center justify-center bg-surface/50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">{t('common.loadingDiffView')}</span>
      </div>
    </div>
  );
}
