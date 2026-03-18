import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, ExternalLink, CheckSquare, Square, Loader2, AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { recordConsent, CONSENT_TERMS, CONSENT_TERMS_VERSION } from '@/lib/consentLog';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  provider: 'Anthropic' | 'OpenAI' | 'Google Gemini';
}

export function AiConsentDialog({ isOpen, onClose, onAccept, provider }: Props) {
  const [checks, setChecks] = useState([false, false, false]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  const allChecked = checks.every(Boolean);

  const toggleCheck = (index: number) => {
    if (isSubmitting) return;
    setChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));
    setError(null);
  };

  const handleAccept = async () => {
    if (!allChecked || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Record consent — server receipt is REQUIRED
      // If server fails, this throws and consent is NOT granted
      const providerKey = useSettingsStore.getState().settings.aiProvider;
      await recordConsent('grant', providerKey);

      // Only reaches here if server confirmed
      await updateSetting('aiConsentAccepted', true);
      await updateSetting('aiConsentDate', new Date().toISOString());
      onAccept();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'CONSENT_SERVER_FAILED') {
        setError('Could not record your consent on our server. Please check your internet connection and try again. Consent cannot be granted without server confirmation.');
      } else {
        setError(`An error occurred: ${msg}. Please try again.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-[420px] max-h-[90vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-yellow-500" />
                <h2 className="font-semibold text-sm">AI Data Processing Consent</h2>
              </div>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Warning Banner */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                  AI features require sending your clipboard content to external servers.
                  Please read carefully before proceeding.
                </p>
              </div>

              {/* What happens */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What happens when you use AI features
                </h3>
                <ul className="space-y-1.5 text-xs text-foreground/80">
                  <li className="flex gap-2">
                    <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>
                      Your clipboard text is sent to <strong>{provider}</strong>'s servers
                      for processing via their API.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>
                      Data is transmitted over encrypted HTTPS, but is processed on
                      third-party infrastructure outside your control.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>
                      {provider}'s own privacy policy and data retention rules apply to
                      the content you send.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Safety measures */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Safety measures in place
                </h3>
                <ul className="space-y-1 text-xs text-foreground/80 list-disc pl-4">
                  <li>AI actions are automatically blocked for items detected as sensitive (passwords, API keys, financial data)</li>
                  <li>A confirmation prompt is shown before each AI request</li>
                  <li>Your API key is stored locally and never shared with QlipLab</li>
                  <li>No data is sent without your explicit action</li>
                </ul>
              </section>

              {/* Consent checkboxes */}
              <section className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  I acknowledge and accept
                </h3>
                {CONSENT_TERMS.map((term, i) => (
                  <ConsentCheckbox
                    key={i}
                    checked={checks[i]}
                    onChange={() => toggleCheck(i)}
                    label={term}
                    disabled={isSubmitting}
                  />
                ))}
              </section>

              {/* Error message */}
              {error && (
                <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pt-2 text-[10px] text-muted-foreground text-center">
              Terms v{CONSENT_TERMS_VERSION} — Your consent will be recorded locally and on our server
            </div>
            <div className="p-4 pt-2 flex gap-2">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2 text-xs rounded-lg border border-border hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!allChecked || isSubmitting}
                className={cn(
                  'flex-1 py-2 text-xs rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5',
                  allChecked && !isSubmitting
                    ? 'bg-accent text-white hover:bg-accent/90 cursor-pointer'
                    : 'bg-border text-muted-foreground cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'I Accept — Enable AI'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="flex items-start gap-2 text-left w-full group cursor-pointer disabled:opacity-50"
    >
      {checked ? (
        <CheckSquare className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
      ) : (
        <Square className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
      )}
      <span className="text-xs text-foreground/80">{label}</span>
    </button>
  );
}
