import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Loader2, AlertTriangle } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { EULA_TEXT, EULA_VERSION } from '@/lib/eula';
import { recordConsent } from '@/lib/consentLog';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';

export function EulaDialog() {
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAccept = async () => {
    if (!hasScrolledToEnd || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Record EULA acceptance — server receipt is REQUIRED
      // If server fails, this throws and EULA is NOT accepted
      await recordConsent('grant', 'eula', {
        termsVersion: EULA_VERSION,
        termsText: EULA_TEXT,
      });

      // Only reaches here if server confirmed — single atomic write
      await updateSettings({
        eulaAccepted: true,
        eulaAcceptedVersion: EULA_VERSION,
        eulaAcceptedAt: new Date().toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'CONSENT_SERVER_FAILED') {
        setError('Could not record your acceptance on our server. Please check your internet connection and try again.');
      } else {
        setError(`An error occurred: ${msg}. Please try again.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    await getCurrentWindow().close();
  };

  const canAccept = hasScrolledToEnd && !isSubmitting;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 rounded-lg overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-[400px] max-h-[90vh] bg-surface rounded-xl shadow-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 shrink-0">
          <ScrollText className="w-5 h-5 text-accent shrink-0" />
          <div>
            <h2 className="text-sm font-semibold">License Agreement</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Please read and accept to continue
            </p>
          </div>
        </div>

        {/* EULA Content */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-4 min-h-0"
        >
          <pre className="text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans">
            {EULA_TEXT}
          </pre>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mb-2 flex gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-destructive" />
            <p className="text-[10px] text-destructive">{error}</p>
          </div>
        )}

        {/* Scroll hint */}
        {!hasScrolledToEnd && !error && (
          <div className="px-5 py-2 border-t border-border/50 shrink-0">
            <p className="text-[10px] text-muted-foreground text-center">
              Scroll to the end to enable the Accept button
            </p>
          </div>
        )}

        {/* Version info */}
        <div className="px-5 pt-2 text-[9px] text-muted-foreground/50 text-center shrink-0">
          EULA v{EULA_VERSION} — Your acceptance will be recorded locally and on our server
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border/50 shrink-0">
          <button
            onClick={handleDecline}
            disabled={isSubmitting}
            className={cn(
              'flex-1 py-2 text-xs rounded-md transition-colors cursor-pointer',
              'bg-surface-hover text-foreground hover:bg-border disabled:opacity-50'
            )}
          >
            Decline & Exit
          </button>
          <button
            onClick={handleAccept}
            disabled={!canAccept}
            className={cn(
              'flex-1 py-2 text-xs rounded-md transition-colors flex items-center justify-center gap-1.5',
              canAccept
                ? 'bg-accent text-white hover:bg-accent/90 cursor-pointer'
                : 'bg-accent/30 text-white/50 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Recording...
              </>
            ) : (
              'I Accept'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
