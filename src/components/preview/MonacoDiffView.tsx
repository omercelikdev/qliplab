import { Suspense, lazy, useMemo } from 'react';
import { usePreviewStore, getMonacoLanguage } from '@/stores/previewStore';
import { useSettingsStore } from '@/stores/settingsStore';

const MonacoDiffEditor = lazy(() =>
  import('@monaco-editor/react').then((mod) => ({ default: mod.DiffEditor }))
);

export function MonacoDiffView() {
  const { diffItems } = usePreviewStore();
  const { settings } = useSettingsStore();
  const [left, right] = diffItems;

  const language = useMemo(() => {
    // Use the format of the first item, or plaintext
    if (left) return getMonacoLanguage(left.detectedFormat);
    if (right) return getMonacoLanguage(right.detectedFormat);
    return 'plaintext';
  }, [left, right]);

  const theme = settings.theme === 'dark' ? 'vs-dark' : 'light';

  const options = useMemo(() => ({
    readOnly: true,
    minimap: { enabled: false },
    fontSize: 12,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    lineNumbersMinChars: 3,
    renderSideBySide: true,
    glyphMargin: false,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  }), []);

  // Create a unique key to force remount when items change
  const diffKey = useMemo(() => {
    const leftId = left?.id || 'none';
    const rightId = right?.id || 'none';
    return `diff-${leftId}-${rightId}`;
  }, [left?.id, right?.id]);

  if (!left || !right) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
        Select two items to compare
      </div>
    );
  }

  return (
    <Suspense fallback={<DiffSkeleton />}>
      <MonacoDiffEditor
        key={diffKey}
        height="100%"
        language={language}
        original={left.content}
        modified={right.content}
        theme={theme}
        options={options}
        loading={<DiffSkeleton />}
      />
    </Suspense>
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
