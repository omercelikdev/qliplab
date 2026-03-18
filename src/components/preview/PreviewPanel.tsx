import { useRef, useCallback, useEffect, Suspense, lazy, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Copy, ClipboardPaste, Columns2, Rows2, GitCompare, Image as ImageIcon, Code, Eye, Plus, ChevronRight } from 'lucide-react';
import { usePreviewStore, getMonacoLanguage } from '@/stores/previewStore';
import type { PipelineStep } from '@/stores/previewStore';
import { getTransformById, getRecommendedTransforms } from '@/lib/transformRegistry';
import type { TransformDef } from '@/lib/transformRegistry';
import { useSettingsStore } from '@/stores/settingsStore';
import { EditorView } from './EditorView';
import { ImageView } from './ImageView';
import { FormatIcon } from '@/components/history/FormatIcon';
import { getFormatDisplayName, detectFormat } from '@/lib/formatDetector';
import { writeText, writeImage } from '@tauri-apps/plugin-clipboard-manager';
import { writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { Image } from '@tauri-apps/api/image';
import { hideWriteAndPaste } from '@/lib/window';
import { renderMarkdown } from '@/lib/markdownRenderer';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

const MonacoDiffEditor = lazy(() =>
  import('@monaco-editor/react').then((mod) => ({ default: mod.DiffEditor }))
);

export function PreviewPanel() {
  const { t } = useTranslation();
  const { isOpen, mode, editedContent, transformType, sourceItem, diffItems, diffViewMode, setDiffViewMode, pipelineSteps, addPipelineStep, removePipelineStep, close } = usePreviewStore();
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
        await writeText(editedContent);
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
        await writeText(editedContent);
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
            onClick={close}
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
          onRemoveStep={removePipelineStep}
          onAddStep={async (transformId) => {
            const def = getTransformById(transformId);
            if (!def) return;
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
  onRemoveStep,
  onAddStep,
  showPicker,
  onTogglePicker,
  onClosePicker,
}: {
  steps: PipelineStep[];
  detectedFormat: string;
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
      </div>

      {showPicker && (
        <TransformPicker
          detectedFormat={detectedFormat}
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

function TransformPicker({
  detectedFormat,
  onSelect,
  onClose,
}: {
  detectedFormat: string;
  onSelect: (transformId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

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

  const { recommended, others } = useMemo(
    () => getRecommendedTransforms(detectedFormat as import('@/types/clipboard').DetectedFormat),
    [detectedFormat]
  );

  const filterList = (list: TransformDef[]) => {
    if (!filter) return list;
    const q = filter.toLowerCase();
    return list.filter(t => t.label.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  };

  const filteredRecommended = filterList(recommended);
  const filteredOthers = filterList(others);

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 right-0 z-50 bg-surface border border-border rounded-b-lg shadow-lg max-h-[250px] overflow-y-auto"
    >
      <div className="sticky top-0 bg-surface p-2 border-b border-border/50">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('preview.searchTransforms')}
          className="w-full px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:ring-1 focus:ring-accent"
          autoFocus
        />
      </div>
      <div className="p-1">
        {/* Recommended transforms for this format */}
        {filteredRecommended.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {t('preview.recommended')}
            </div>
            {filteredRecommended.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="w-full text-start px-2 py-1 text-xs hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Other available transforms */}
        {filteredOthers.length > 0 && (
          <div>
            {filteredRecommended.length > 0 && <div className="h-px bg-border/50 my-1" />}
            <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {t('preview.other')}
            </div>
            {filteredOthers.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="w-full text-start px-2 py-1 text-xs hover:bg-surface-hover rounded transition-colors cursor-pointer text-muted-foreground"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {filteredRecommended.length === 0 && filteredOthers.length === 0 && (
          <div className="p-3 text-center text-xs text-muted-foreground">
            {t('preview.noTransformsMatch', { query: filter })}
          </div>
        )}
      </div>
    </div>
  );
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
