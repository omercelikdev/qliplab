import { useState, useEffect, useCallback, Suspense, lazy, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { useSnippetStore } from '@/stores/snippetStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AVAILABLE_VARIABLES } from '@/lib/snippetVariables';
import { cn } from '@/lib/utils';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const SYNTAX_OPTIONS = [
  { value: 'plain', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'shell', label: 'Shell' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
];

export function SnippetEditorPanel() {
  const { editorOpen, editingSnippet, closeEditor, createSnippet, updateSnippet } = useSnippetStore();
  const { settings } = useSettingsStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [syntax, setSyntax] = useState('plain');

  const isEditMode = Boolean(editingSnippet);

  useEffect(() => {
    if (editingSnippet) {
      setTitle(editingSnippet.title);
      setContent(editingSnippet.content);
      setSyntax(editingSnippet.syntax || 'plain');
    } else {
      setTitle('');
      setContent('');
      setSyntax('plain');
    }
  }, [editingSnippet, editorOpen]);

  const handleSave = async () => {
    if (!title.trim()) return;

    if (isEditMode && editingSnippet) {
      await updateSnippet(editingSnippet.id, { title, content, syntax });
    } else {
      await createSnippet({ title, content, syntax, isFavorite: false });
    }
    closeEditor();
  };

  // ESC to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeEditor();
  }, [closeEditor]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const monacoLanguage = syntax === 'plain' ? 'plaintext' : syntax === 'shell' ? 'shell' : syntax;
  const theme = settings.theme === 'dark' ? 'vs-dark' : 'light';

  const editorOptions = useMemo(() => ({
    minimap: { enabled: false },
    fontSize: 12,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    lineNumbersMinChars: 3,
    folding: false,
    glyphMargin: false,
    scrollbar: {
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
  }), []);

  if (!editorOpen) return null;

  return (
    <motion.div
      key={editingSnippet?.id ?? 'new'}
      initial={{ opacity: 0, flex: 0 }}
      animate={{ opacity: 1, flex: 1 }}
      exit={{ opacity: 0, flex: 0 }}
      transition={{ duration: 0.15 }}
      className="h-full border-l border-border flex flex-col bg-background overflow-hidden"
    >
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-border/50 bg-surface/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">{isEditMode ? 'Edit Snippet' : 'New Snippet'}</span>
        </div>
        <button
          onClick={closeEditor}
          className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title + Syntax row */}
      <div className="flex gap-2 px-3 py-2 border-b border-border/50 shrink-0">
        <input
          type="text"
          placeholder="Snippet title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            'flex-1 px-2.5 py-1.5 bg-surface border border-border rounded-md text-xs',
            'outline-none focus:ring-1 focus:ring-accent'
          )}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeEditor();
          }}
        />
        <select
          value={syntax}
          onChange={(e) => setSyntax(e.target.value)}
          className={cn(
            'px-2 py-1.5 bg-surface border border-border rounded-md text-[11px]',
            'outline-none focus:ring-1 focus:ring-accent cursor-pointer'
          )}
        >
          {SYNTAX_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Loading editor...
          </div>
        }>
          <MonacoEditor
            height="100%"
            language={monacoLanguage}
            value={content}
            theme={theme}
            options={editorOptions}
            onChange={(value) => setContent(value || '')}
          />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/50 bg-surface/30 space-y-2 shrink-0">
        {/* Variables */}
        <div className="flex flex-wrap gap-1">
          {AVAILABLE_VARIABLES.map((v) => (
            <button
              key={v.name}
              type="button"
              title={v.description}
              onClick={() => setContent((c) => c + v.name)}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-border rounded hover:bg-surface-hover transition-colors cursor-pointer"
            >
              {v.name}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className={cn(
            'w-full py-1.5 text-xs font-medium cursor-pointer',
            'bg-accent text-accent-foreground rounded-md',
            'hover:bg-accent/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isEditMode ? 'Save Changes' : 'Create Snippet'}
        </button>
      </div>
    </motion.div>
  );
}
