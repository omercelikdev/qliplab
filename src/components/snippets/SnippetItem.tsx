import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Code, Braces, Globe, Pin, PinOff, Trash2, Pencil, FileText, Terminal, Type } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideWriteAndPaste } from '@/lib/window';
import { expandVariables } from '@/lib/snippetVariables';
import { useSnippetStore } from '@/stores/snippetStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Snippet } from '@/types/snippet';
import { cn } from '@/lib/utils';

// Syntax badge config — reuses the same visual language as HistoryItem
const SYNTAX_BADGE: Record<string, { icon: React.ElementType; label: string; style: string }> = {
  javascript: { icon: Code, label: 'JS', style: 'text-blue-400 bg-blue-500/10' },
  typescript: { icon: Code, label: 'TS', style: 'text-blue-400 bg-blue-500/10' },
  python:     { icon: Code, label: 'PY', style: 'text-blue-400 bg-blue-500/10' },
  go:         { icon: Code, label: 'Go', style: 'text-blue-400 bg-blue-500/10' },
  rust:       { icon: Code, label: 'RS', style: 'text-blue-400 bg-blue-500/10' },
  java:       { icon: Code, label: 'Java', style: 'text-blue-400 bg-blue-500/10' },
  sql:        { icon: Code, label: 'SQL', style: 'text-blue-400 bg-blue-500/10' },
  shell:      { icon: Terminal, label: 'SH', style: 'text-blue-400 bg-blue-500/10' },
  json:       { icon: Braces, label: 'JSON', style: 'text-emerald-500 bg-emerald-500/8' },
  yaml:       { icon: Braces, label: 'YAML', style: 'text-emerald-500 bg-emerald-500/8' },
  xml:        { icon: Braces, label: 'XML', style: 'text-emerald-500 bg-emerald-500/8' },
  csv:        { icon: Braces, label: 'CSV', style: 'text-emerald-500 bg-emerald-500/8' },
  html:       { icon: Globe, label: 'HTML', style: 'text-orange-500 bg-orange-500/8' },
  css:        { icon: Globe, label: 'CSS', style: 'text-orange-500 bg-orange-500/8' },
  markdown:   { icon: FileText, label: 'MD', style: 'text-orange-500 bg-orange-500/8' },
};

const CODE_SYNTAXES = new Set([
  'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'sql', 'shell',
  'json', 'yaml', 'xml', 'csv', 'html', 'css',
]);

interface SnippetItemProps {
  snippet: Snippet;
  isSelected?: boolean;
  onEdit?: (snippet: Snippet) => void;
}

export const SnippetItem = memo(function SnippetItem({ snippet, isSelected = false, onEdit }: SnippetItemProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const updateSnippet = useSnippetStore((state) => state.updateSnippet);
  const deleteSnippet = useSnippetStore((state) => state.deleteSnippet);

  const handleClick = async () => {
    const expanded = await expandVariables(snippet.content);
    await hideWriteAndPaste(async () => {
      await writeText(expanded);
    });
  };

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSnippet(snippet.id, { isPinned: !snippet.isPinned });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(snippet);
  };

  const badge = SYNTAX_BADGE[snippet.syntax];
  const isMonospace = CODE_SYNTAXES.has(snippet.syntax);

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 h-8 px-2.5 rounded-md cursor-pointer',
        'transition-[background-color] duration-100 ease-out',
        'active:scale-[0.98] active:transition-transform',
        isHovered
          ? 'bg-foreground/[0.03] dark:bg-white/[0.03]'
          : 'bg-transparent',
        isSelected && 'bg-accent/[0.07]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Syntax badge or plain icon */}
      {badge ? (
        <span className={cn(
          'inline-flex items-center gap-[3px] text-[9px] font-semibold tracking-[0.02em] px-[5px] py-[1px] rounded shrink-0 leading-4',
          badge.style
        )}>
          <badge.icon className="w-2.5 h-2.5" />
          {badge.label}
        </span>
      ) : (
        <Type className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      )}

      {/* Trigger badge */}
      {snippet.trigger && (
        <span className="text-[9px] font-mono font-semibold text-violet-500 bg-violet-500/10 px-[5px] py-[1px] rounded shrink-0 leading-4">
          {snippet.trigger}
        </span>
      )}

      {/* Title + content preview */}
      <span className={cn(
        'flex-1 min-w-0 truncate text-xs',
        isMonospace && 'font-mono text-[11px]'
      )}>
        <span className="font-medium">{snippet.title}</span>
        <span className="text-foreground/35 ms-1.5">{snippet.content.slice(0, 100).replace(/\n/g, ' ')}</span>
      </span>

      {/* Action buttons — fade in/out: Pin/Unpin, Edit, Delete */}
      <div className={cn(
        'flex items-center gap-0.5 transition-opacity duration-100 ease-out',
        isHovered ? 'opacity-100' : 'opacity-0'
      )}>
        <button
          onClick={togglePin}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
          title={snippet.isPinned ? t('common.unpin') : t('common.pin')}
        >
          {snippet.isPinned
            ? <PinOff className="w-3.5 h-3.5 text-accent" />
            : <Pin className="w-3.5 h-3.5 text-muted-foreground" />
          }
        </button>
        <button
          onClick={handleEdit}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
          title={t('common.edit')}
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={handleDelete}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center text-destructive cursor-pointer"
          title={t('common.delete')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('snippets.deleteTitle')}
        message={t('snippets.deleteMessage', { title: snippet.title })}
        onConfirm={() => { setShowDeleteConfirm(false); deleteSnippet(snippet.id); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
});
