import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText, X } from 'lucide-react';
import { EULA_TEXT } from '@/lib/eula';
import { cn } from '@/lib/utils';

interface EulaViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EulaViewerDialog({ isOpen, onClose }: EulaViewerDialogProps) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 rounded-lg overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-[400px] max-h-[80vh] bg-surface rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-accent" />
                <h2 className="text-sm font-semibold">{t('settings.privacy.termsOfUse')}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
              <pre className="text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans">
                {EULA_TEXT}
              </pre>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border/50 shrink-0">
              <button
                onClick={onClose}
                className={cn(
                  'w-full py-2 text-xs rounded-md transition-colors cursor-pointer',
                  'bg-surface-hover text-foreground hover:bg-border'
                )}
              >
                {t('common.close')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
