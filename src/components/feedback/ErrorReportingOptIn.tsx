import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Check } from 'lucide-react';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { cn } from '@/lib/utils';

interface ErrorReportingOptInProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ErrorReportingOptIn({ isOpen, onClose }: ErrorReportingOptInProps) {
  const setAutoErrorReporting = useFeedbackStore((s) => s.setAutoErrorReporting);
  const setHasSeenOptIn = useFeedbackStore((s) => s.setHasSeenOptIn);

  const handleEnable = async () => {
    await setAutoErrorReporting(true);
    await setHasSeenOptIn(true);
    onClose();
  };

  const handleDecline = async () => {
    await setAutoErrorReporting(false);
    await setHasSeenOptIn(true);
    onClose();
  };

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
            className="w-[340px] bg-surface rounded-xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <h2 className="font-semibold">Help Improve qliplab</h2>
              </div>
              <button
                onClick={handleDecline}
                className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Would you like to automatically send crash reports to help us fix bugs?
              </p>

              {/* What we collect */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">What we collect:</p>
                <ul className="space-y-1">
                  {[
                    'Error messages and stack traces',
                    'App version and OS',
                    'Which feature was being used',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* What we don't collect */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">What we DON'T collect:</p>
                <ul className="space-y-1">
                  {[
                    'Your clipboard content',
                    'Your snippets or vault data',
                    'Personal information',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <X className="w-3 h-3 text-destructive" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                You can change this anytime in Settings.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t border-border/50">
              <button
                onClick={handleDecline}
                className={cn(
                  'flex-1 py-2 text-sm rounded-md transition-colors cursor-pointer',
                  'bg-surface-hover text-foreground hover:bg-border'
                )}
              >
                No Thanks
              </button>
              <button
                onClick={handleEnable}
                className={cn(
                  'flex-1 py-2 text-sm rounded-md transition-colors cursor-pointer',
                  'bg-accent text-white hover:bg-accent/90'
                )}
              >
                Enable Reporting
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
