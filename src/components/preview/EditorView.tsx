import { useState, useEffect, useMemo, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreviewStore, getMonacoLanguage } from '@/stores/previewStore';
import { useSettingsStore } from '@/stores/settingsStore';

// Dynamically load Monaco with error-resilient fallback
function useMonacoEditor() {
  const [Editor, setEditor] = useState<ComponentType<{
    key?: string;
    height?: string;
    language?: string;
    value?: string;
    theme?: string;
    options?: Record<string, unknown>;
    onChange?: (value: string | undefined) => void;
    loading?: React.ReactNode;
  }> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!Editor && !cancelled) setFailed(true);
    }, 5000);

    import('@monaco-editor/react')
      .then((mod) => {
        if (!cancelled) {
          setEditor(() => mod.default as ComponentType<{
            key?: string;
            height?: string;
            language?: string;
            value?: string;
            theme?: string;
            options?: Record<string, unknown>;
            onChange?: (value: string | undefined) => void;
            loading?: React.ReactNode;
          }>);
          clearTimeout(timer);
        }
      })
      .catch((err) => {
        console.error('[qliplab] Monaco editor failed to load:', err);
        if (!cancelled) setFailed(true);
        clearTimeout(timer);
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { Editor, failed };
}

export function EditorView() {
  const { sourceItem, editedContent, setEditedContent, mode, transformType } = usePreviewStore();
  const { settings } = useSettingsStore();
  const { Editor, failed } = useMonacoEditor();

  const language = useMemo(() => {
    if (!sourceItem) return 'plaintext';
    return getMonacoLanguage(sourceItem.detectedFormat);
  }, [sourceItem]);

  // Both view and transform modes use editedContent (editable)
  const content = editedContent;

  // Create a unique key to force remount when item or transform changes
  const editorKey = useMemo(() => {
    const itemId = sourceItem?.id || 'none';
    const transformKey = mode === 'transform' ? transformType : mode;
    return `${itemId}-${transformKey}`;
  }, [sourceItem?.id, mode, transformType]);

  const editorOptions = useMemo(() => ({
    readOnly: false,
    minimap: { enabled: false },
    fontSize: 12,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    lineNumbersMinChars: 3,
    folding: true,
    glyphMargin: false,
    renderLineHighlight: 'line' as const,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  }), [mode]);

  const theme = settings.theme === 'dark' ? 'vs-dark' : 'light';

  // Fallback: plain textarea when Monaco fails to load (e.g. sandbox restrictions)
  if (failed) {
    return (
      <FallbackEditor
        content={content}
        onChange={setEditedContent}
      />
    );
  }

  // Still loading Monaco
  if (!Editor) {
    return <EditorSkeleton />;
  }

  return (
    <Editor
      key={editorKey}
      height="100%"
      language={language}
      value={content}
      theme={theme}
      options={editorOptions}
      onChange={(value) => setEditedContent(value || '')}
      loading={<EditorSkeleton />}
    />
  );
}

function FallbackEditor({ content, onChange }: { content: string | undefined; onChange: (value: string) => void }) {
  return (
    <textarea
      className="h-full w-full bg-background text-foreground font-mono text-xs p-3 resize-none outline-none border-none"
      value={content ?? ''}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  );
}

function EditorSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="h-full w-full flex items-center justify-center bg-surface/50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">{t('common.loadingEditor')}</span>
      </div>
    </div>
  );
}
