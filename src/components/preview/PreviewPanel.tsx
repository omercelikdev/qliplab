import { motion } from 'framer-motion';
import { X, Copy, ClipboardPaste } from 'lucide-react';
import { usePreviewStore } from '@/stores/previewStore';
import { TransformView } from './TransformView';
import { DiffView } from './DiffView';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideAndPaste } from '@/lib/window';
import { cn } from '@/lib/utils';

export function PreviewPanel() {
  const { isOpen, mode, transformedContent, transformType, close } = usePreviewStore();

  if (!isOpen) return null;

  const handleCopy = async () => {
    await writeText(transformedContent);
  };

  const handlePaste = async () => {
    await writeText(transformedContent);
    close();
    await hideAndPaste();
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 420, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full border-l border-border flex flex-col shrink-0"
    >
      <div className="h-8 flex items-center justify-between px-2.5 border-b border-border/50">
        <span className="text-xs font-medium truncate">{mode === 'transform' ? transformType : 'Diff'}</span>
        <button onClick={close} className="p-0.5 hover:bg-surface-hover rounded transition-colors shrink-0 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {mode === 'transform' ? <TransformView /> : <DiffView />}
      </div>

      {mode === 'transform' && (
        <div className="h-8 flex items-center justify-end gap-1.5 px-2.5 border-t border-border/50">
          <button onClick={handleCopy} className={cn('flex items-center gap-1 px-2 py-1 text-xs cursor-pointer', 'bg-surface hover:bg-surface-hover rounded-md')}>
            <Copy className="w-3 h-3" /> Copy
          </button>
          <button onClick={handlePaste} className={cn('flex items-center gap-1 px-2 py-1 text-xs cursor-pointer', 'bg-accent text-accent-foreground rounded-md hover:bg-accent/90')}>
            <ClipboardPaste className="w-3 h-3" /> Paste
          </button>
        </div>
      )}
    </motion.div>
  );
}
