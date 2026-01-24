import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSnippetStore } from '@/stores/snippetStore';
import { cn } from '@/lib/utils';

interface NewSnippetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewSnippetDialog({ isOpen, onClose }: NewSnippetDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const createSnippet = useSnippetStore((state) => state.createSnippet);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await createSnippet({ title, content, syntax: 'plain', isFavorite: false });
    setTitle('');
    setContent('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 rounded-lg overflow-hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute inset-4 bg-background border border-border rounded-xl shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 flex items-center justify-between px-4 border-b border-border">
              <h2 className="font-semibold">New Snippet</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm',
                  'outline-none focus:ring-2 focus:ring-accent'
                )}
                autoFocus
              />
              <textarea
                placeholder="Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className={cn(
                  'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm',
                  'outline-none focus:ring-2 focus:ring-accent font-mono resize-none'
                )}
              />
              <button
                type="submit"
                className={cn(
                  'w-full py-2 text-sm font-medium cursor-pointer',
                  'bg-accent text-accent-foreground rounded-lg',
                  'hover:bg-accent/90 transition-colors'
                )}
              >
                Create Snippet
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
