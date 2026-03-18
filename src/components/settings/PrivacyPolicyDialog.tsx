import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CONFIG } from '@/lib/config';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyDialog({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[60] rounded-lg overflow-hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute inset-4 bg-background border border-border rounded-xl shadow-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
              <h2 className="font-semibold">{t('privacy.title')}</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-foreground/90">
              <p className="text-xs text-muted-foreground">
                Last updated: February 2026 | QlipLab v{CONFIG.APP_VERSION}
              </p>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Overview</h3>
                <p>
                  QlipLab is a local-first clipboard manager. Your data stays on your device.
                  We do not collect, transmit, or store your clipboard content on any external server.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Data We Access</h3>
                <ul className="list-disc ps-4 space-y-1">
                  <li>
                    <strong>Clipboard content</strong> — Text and images you copy are stored locally
                    in a SQLite database on your device. This data never leaves your computer.
                  </li>
                  <li>
                    <strong>Secure vault data</strong> — Vault items are encrypted with AES-256-GCM
                    using a password only you know. Encrypted data is stored locally.
                  </li>
                  <li>
                    <strong>App settings</strong> — Your preferences (theme, history limit, etc.)
                    are stored locally on your device.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Optional Data Collection</h3>
                <ul className="list-disc ps-4 space-y-1">
                  <li>
                    <strong>Crash reports (opt-in)</strong> — If you enable auto error reporting,
                    we send crash details (error message, stack trace, app version, OS version)
                    to help improve the app. No clipboard content, vault data, or personal
                    information is included in these reports.
                  </li>
                  <li>
                    <strong>Manual feedback</strong> — When you submit an issue report, only the
                    information you explicitly type is sent.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Data We Do NOT Collect</h3>
                <ul className="list-disc ps-4 space-y-1">
                  <li>No analytics or usage tracking</li>
                  <li>No advertising identifiers</li>
                  <li>No clipboard content is sent by QlipLab itself (see AI Features below for user-initiated transfers)</li>
                  <li>No vault passwords or encrypted data is transmitted</li>
                  <li>No personal information is collected</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Data Storage</h3>
                <p>
                  All data is stored locally in the app's sandboxed data directory. Clipboard
                  history is stored in plain text in SQLite. Vault items are encrypted with
                  AES-256-GCM before storage. You can delete all data at any time from within the app.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">AI Features (Optional, User-Initiated)</h3>
                <p>
                  QlipLab offers optional AI-powered text processing (summarize, translate, fix
                  grammar, etc.). These features are <strong>disabled by default</strong> and require:
                </p>
                <ul className="list-disc ps-4 space-y-1 mt-1">
                  <li>You to provide your own API key (Anthropic or OpenAI)</li>
                  <li>Explicit consent via a dedicated consent dialog with checkboxes</li>
                  <li>Manual confirmation before each individual AI request</li>
                </ul>
                <p className="mt-2 font-medium">When you use AI features:</p>
                <ul className="list-disc ps-4 space-y-1 mt-1">
                  <li>Your clipboard text content is sent directly from your device to the
                    selected AI provider's API (Anthropic or OpenAI) over encrypted HTTPS</li>
                  <li>QlipLab does NOT act as an intermediary — data goes directly from your
                    device to the provider</li>
                  <li>QlipLab does NOT store, log, or have access to the data you send to AI providers</li>
                  <li>The AI provider's own privacy policy and data retention rules apply</li>
                </ul>
                <p className="mt-2 font-medium">Safety measures:</p>
                <ul className="list-disc ps-4 space-y-1 mt-1">
                  <li>AI actions are automatically blocked for items detected as sensitive
                    (passwords, API keys, credit cards, personal IDs)</li>
                  <li>A confirmation dialog is shown before every AI request</li>
                  <li>Vault-encrypted data is never accessible to AI features</li>
                  <li>No AI processing occurs without your explicit, manual action</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Third-Party Services</h3>
                <ul className="list-disc ps-4 space-y-1">
                  <li>
                    <strong>Crash reporting (opt-in)</strong> — Uses a secure endpoint to create
                    GitHub issues. No clipboard or personal data is included.
                  </li>
                  <li>
                    <strong>AI providers (opt-in, user-initiated)</strong> — When you explicitly use
                    AI features, your clipboard text is sent to Anthropic (api.anthropic.com) or
                    OpenAI (api.openai.com) depending on your chosen provider. See their respective
                    privacy policies for data handling details.
                  </li>
                </ul>
                <p className="mt-1">
                  No third-party analytics, advertising, or tracking services are used.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Disclaimer & Limitation of Liability</h3>
                <div className="bg-surface border border-border rounded-lg p-3 space-y-2 text-xs">
                  <p>
                    QlipLab is provided "AS IS" without warranty of any kind, express or implied.
                  </p>
                  <p>
                    <strong>AI features:</strong> When you choose to use AI features, you are solely
                    responsible for the content you send to third-party AI providers. QlipLab and its
                    developers accept no liability for any data you choose to transmit to external
                    services. AI features require your explicit consent and manual confirmation before
                    any data is sent.
                  </p>
                  <p>
                    <strong>Sensitive data detection:</strong> QlipLab uses automated pattern matching
                    to detect potentially sensitive content (passwords, API keys, financial data).
                    This detection is provided as a convenience and is NOT guaranteed to catch all
                    sensitive content. You remain responsible for reviewing content before using
                    AI features.
                  </p>
                  <p>
                    <strong>Encryption:</strong> Vault encryption uses industry-standard AES-256-GCM.
                    However, no encryption system is infallible. We do not guarantee absolute security
                    of vault data.
                  </p>
                  <p>
                    In no event shall QlipLab or its developers be liable for any direct, indirect,
                    incidental, special, or consequential damages arising from the use of this software,
                    including but not limited to data loss, unauthorized data disclosure, or damages
                    resulting from the use of third-party AI services.
                  </p>
                </div>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Your Rights</h3>
                <ul className="list-disc ps-4 space-y-1">
                  <li>You can disable image storage at any time in Settings</li>
                  <li>You can clear all clipboard history at any time</li>
                  <li>You can enable auto-clear on quit</li>
                  <li>You can disable crash reporting at any time</li>
                  <li>You can revoke AI consent at any time in Settings, which disables all AI features</li>
                  <li>You can delete your API key at any time from Settings</li>
                  <li>Uninstalling the app removes all local data</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Contact</h3>
                <p>
                  For questions about this privacy policy, please open an issue via
                  Settings &gt; Report Issue.
                </p>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
