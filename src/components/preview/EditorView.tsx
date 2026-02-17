import { Suspense, lazy, useMemo } from 'react';
import { usePreviewStore, getMonacoLanguage } from '@/stores/previewStore';
import { useSettingsStore } from '@/stores/settingsStore';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export function EditorView() {
  const { sourceItem, editedContent, setEditedContent, mode, transformType } = usePreviewStore();
  const { settings } = useSettingsStore();

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

  const isViewMode = mode === 'view';

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
  }), [mode, isViewMode]);

  const theme = settings.theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <MonacoEditor
        key={editorKey}
        height="100%"
        language={language}
        value={content}
        theme={theme}
        options={editorOptions}
        onChange={(value) => setEditedContent(value || '')}
        loading={<EditorSkeleton />}
      />
    </Suspense>
  );
}

function EditorSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-surface/50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading editor...</span>
      </div>
    </div>
  );
}
