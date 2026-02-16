import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Code, Star, Trash2, Pencil } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideWriteAndPaste } from '@/lib/window';
import { expandVariables } from '@/lib/snippetVariables';
import { useSnippetStore } from '@/stores/snippetStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Snippet } from '@/types/snippet';
import { cn } from '@/lib/utils';

interface SnippetItemProps {
  snippet: Snippet;
  isSelected?: boolean;
  onEdit?: (snippet: Snippet) => void;
}

export const SnippetItem = memo(function SnippetItem({ snippet, isSelected = false, onEdit }: SnippetItemProps) {
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

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSnippet(snippet.id, { isFavorite: !snippet.isFavorite });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(snippet);
  };

  return (
    <motion.div
      className={cn(
        'relative flex items-center gap-2 h-9 px-2.5 rounded-md cursor-pointer transition-colors',
        isHovered ? 'bg-surface-hover' : 'bg-transparent',
        isSelected && 'bg-accent/20 ring-1 ring-accent'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
    >
      <Code className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0 leading-tight">
        <span className="text-xs font-medium truncate block">{snippet.title}</span>
        <span className="text-[10px] text-muted-foreground truncate block">{snippet.content.slice(0, 200).replace(/\n/g, ' ')}</span>
      </div>

      {snippet.isFavorite && !isHovered && (
        <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500 shrink-0" />
      )}

      {isHovered && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={toggleFavorite}
            className="p-0.5 hover:bg-surface rounded transition-colors cursor-pointer"
          >
            <Star className={cn(
              'w-3.5 h-3.5',
              snippet.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
            )} />
          </button>
          <button
            onClick={handleEdit}
            className="p-0.5 hover:bg-surface rounded transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={handleDelete}
            className="p-0.5 hover:bg-surface rounded transition-colors text-destructive cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Snippet"
        message={`"${snippet.title}" will be permanently deleted.`}
        onConfirm={() => { setShowDeleteConfirm(false); deleteSnippet(snippet.id); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
});
