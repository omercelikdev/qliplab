import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({ isOpen, title, message, confirmLabel, onConfirm, onCancel, destructive = true }: ConfirmDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const label = confirmLabel || t('common.delete');

  // Auto-focus Cancel button when dialog opens & handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onCancel]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[10000] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface border border-border rounded-xl shadow-lg p-4 max-w-[280px] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
            {/* Messages may carry blank lines to separate a warning from the ask. */}
            <p className="text-xs text-muted-foreground mb-4 whitespace-pre-line">{message}</p>
            <div className="flex gap-2 justify-end">
              <button
                ref={cancelRef}
                onClick={onCancel}
                className="px-3 py-1.5 text-xs rounded-md bg-surface-hover hover:bg-border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
                  destructive
                    ? 'bg-destructive text-white hover:bg-destructive/90'
                    : 'bg-accent text-accent-foreground hover:bg-accent/90'
                )}
              >
                {label}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
