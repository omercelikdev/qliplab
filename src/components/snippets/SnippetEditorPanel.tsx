import { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { useSnippetStore } from '@/stores/snippetStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AVAILABLE_VARIABLES } from '@/lib/snippetVariables';
import {
  SNIPPET_SYNTAX_PREFIX,
  buildSnippetTrigger,
  extractSnippetTriggerSuffix,
  isUniqueSnippetTrigger,
} from '@/lib/triggerEngine';
import { cn } from '@/lib/utils';

// Dynamically load Monaco with error-resilient fallback
function useMonacoEditor() {
  const [Editor, setEditor] = useState<ComponentType<{
    height?: string;
    language?: string;
    value?: string;
    theme?: string;
    options?: Record<string, unknown>;
    onChange?: (value: string | undefined) => void;
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
            height?: string;
            language?: string;
            value?: string;
            theme?: string;
            options?: Record<string, unknown>;
            onChange?: (value: string | undefined) => void;
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
  const { t } = useTranslation();
  const { editorOpen, editingSnippet, snippets, categories, closeEditor, createSnippet, updateSnippet } = useSnippetStore();
  const { settings } = useSettingsStore();

  const [title, setTitle] = useState('');
  const [triggerSuffix, setTriggerSuffix] = useState('');
  const [content, setContent] = useState('');
  const [syntax, setSyntax] = useState('plain');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isEditMode = Boolean(editingSnippet);
  const triggerPrefix = SNIPPET_SYNTAX_PREFIX[syntax] ?? ';txt:';

  const originalSuffix = isEditMode && editingSnippet?.trigger
    ? extractSnippetTriggerSuffix(editingSnippet.syntax || 'plain', editingSnippet.trigger)
    : '';

  const isDirty = isEditMode
    ? title !== (editingSnippet?.title ?? '') ||
      triggerSuffix !== originalSuffix ||
      content !== (editingSnippet?.content ?? '') ||
      syntax !== (editingSnippet?.syntax ?? 'plain') ||
      categoryId !== (editingSnippet?.categoryId ?? null)
    : title.length > 0 || content.length > 0 || triggerSuffix.length > 0;

  // A styled dialog rather than window.confirm, which blocks the renderer and
  // looks like it belongs to the OS instead of the app.
  const confirmClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    closeEditor();
  }, [isDirty, closeEditor]);

  useEffect(() => {
    if (editingSnippet) {
      setTitle(editingSnippet.title);
      const syn = editingSnippet.syntax || 'plain';
      setSyntax(syn);
      setTriggerSuffix(editingSnippet.trigger
        ? extractSnippetTriggerSuffix(syn, editingSnippet.trigger)
        : '');
      setContent(editingSnippet.content);
      setCategoryId(editingSnippet.categoryId ?? null);
    } else {
      setTitle('');
      setTriggerSuffix('');
      setContent('');
      setSyntax('plain');
      setCategoryId(null);
    }
  }, [editingSnippet, editorOpen]);

  const triggerFormatError = triggerSuffix.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(triggerSuffix)
    ? t('snippets.editor.triggerFormatError')
    : '';
  const triggerUniqueError = triggerSuffix.length > 0 && !triggerFormatError
    && !isUniqueSnippetTrigger(syntax, triggerSuffix, snippets, editingSnippet?.id)
    ? t('snippets.editor.triggerExistsError')
    : '';
  const triggerError = triggerFormatError || triggerUniqueError;

  const handleSave = async () => {
    if (!title.trim()) return;
    if (triggerError) return;

    const fullTrigger = triggerSuffix ? buildSnippetTrigger(syntax, triggerSuffix) : undefined;

    if (isEditMode && editingSnippet) {
      await updateSnippet(editingSnippet.id, { title, trigger: fullTrigger, content, syntax, categoryId: categoryId ?? undefined });
    } else {
      await createSnippet({ title, trigger: fullTrigger, content, syntax, categoryId: categoryId ?? undefined, isPinned: false });
    }
    closeEditor();
  };

  // ESC to close (with dirty check)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') confirmClose();
  }, [confirmClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const { Editor: MonacoEditorComponent, failed: monacoFailed } = useMonacoEditor();

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
      className="h-full border-s border-border flex flex-col bg-background overflow-hidden"
    >
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-border/50 bg-surface/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">{isEditMode ? t('snippets.editor.editSnippet') : t('snippets.editor.newSnippet')}</span>
        </div>
        <button
          onClick={confirmClose}
          className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
          title={t('snippets.editor.closeEsc')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title + Trigger + Syntax row */}
      <div className="flex gap-2 px-3 py-2 border-b border-border/50 shrink-0">
        <input
          type="text"
          placeholder={t('snippets.editor.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            'flex-1 px-2.5 py-1.5 bg-surface border border-border rounded-md text-xs',
            'outline-none focus:ring-1 focus:ring-accent'
          )}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') confirmClose();
          }}
        />
        <div
          className={cn(
            'flex items-center w-[160px] bg-surface border rounded-md overflow-hidden',
            'focus-within:ring-1 focus-within:ring-accent',
            triggerError ? 'border-destructive' : triggerSuffix ? 'border-accent/50' : 'border-border'
          )}
          title={triggerError || `Full trigger: ${triggerPrefix}${triggerSuffix || '…'}`}
        >
          <span className="px-1.5 py-1.5 text-[10px] font-mono text-muted-foreground bg-surface-hover/50 shrink-0 select-none border-e border-border/50">
            {triggerPrefix}
          </span>
          <input
            type="text"
            placeholder={t('snippets.editor.suffixPlaceholder')}
            value={triggerSuffix}
            onChange={(e) => setTriggerSuffix(e.target.value)}
            className="flex-1 min-w-0 px-1.5 py-1.5 bg-transparent text-xs font-mono outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') confirmClose();
            }}
          />
        </div>
        <SelectMenu
          ariaLabel={t('snippets.editor.syntaxPlainText')}
          triggerClassName={cn(
            'flex items-center justify-between gap-1 px-2 py-1.5 bg-surface border border-border rounded-md text-[11px]',
            'cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-accent'
          )}
          value={syntax}
          onChange={(v) => setSyntax(v)}
          options={SYNTAX_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.value === 'plain' ? t('snippets.editor.syntaxPlainText') : opt.label,
          }))}
        />
        {categories.length > 0 && (
          <SelectMenu
            ariaLabel={t('snippets.folders.label')}
            triggerClassName={cn(
              'flex items-center justify-between gap-1 px-2 py-1.5 bg-surface border border-border rounded-md text-[11px] max-w-[120px]',
              'cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-accent'
            )}
            value={categoryId ?? ''}
            onChange={(v) => setCategoryId(v || null)}
            options={[
              { value: '', label: t('snippets.folders.none') },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
            ]}
          />
        )}
      </div>

      {/* Editor — Monaco with textarea fallback */}
      <div className="flex-1 overflow-hidden min-h-0">
        {monacoFailed ? (
          <textarea
            className="h-full w-full bg-background text-foreground font-mono text-xs p-3 resize-none outline-none border-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        ) : MonacoEditorComponent ? (
          <MonacoEditorComponent
            height="100%"
            language={monacoLanguage}
            value={content}
            theme={theme}
            options={editorOptions}
            onChange={(value) => setContent(value || '')}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            {t('common.loadingEditor')}
          </div>
        )}
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
          {isEditMode ? t('snippets.editor.saveChanges') : t('snippets.editor.createSnippet')}
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title={t('snippets.editor.discardTitle')}
        message={t('snippets.editor.discardMessage')}
        confirmLabel={t('snippets.editor.discard')}
        onConfirm={() => { setShowDiscardConfirm(false); closeEditor(); }}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </motion.div>
  );
}
