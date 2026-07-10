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
                  <li>No clipboard content ever leaves your device</li>
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
                <h3 className="font-semibold text-foreground">Everything Runs Locally</h3>
                <p>
                  QlipLab has no cloud component. Clipboard capture, format detection, transforms,
                  diffing, snippets, the encrypted vault, and text extraction from images (OCR) all
                  run entirely on your machine. Nothing is uploaded, and there is no account to create.
                </p>
                <p className="mt-2">
                  The only network requests QlipLab ever makes are the ones you trigger yourself:
                  submitting a bug report or feedback, checking for an update, and — if you opt in —
                  sending an anonymous crash report. None of these carry clipboard, snippet or vault
                  content.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Sensitive Content</h3>
                <p>
                  QlipLab detects likely secrets (passwords, API keys, tokens, credit cards, personal
                  IDs) and blurs them in the history list until you hover the row. You can turn this
                  off in Settings.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-foreground">Third-Party Services</h3>
                <ul className="list-disc ps-4 space-y-1">
                  <li>
                    <strong>Crash reporting (opt-in)</strong> — Uses a secure endpoint to create
                    GitHub issues. No clipboard or personal data is included.
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
                    <strong>Sensitive data detection:</strong> QlipLab uses automated pattern matching
                    to detect potentially sensitive content (passwords, API keys, financial data).
                    This detection is provided as a convenience and is NOT guaranteed to catch all
                    sensitive content. You remain responsible for what you copy and paste.
                  </p>
                  <p>
                    <strong>Encryption:</strong> Vault encryption uses industry-standard AES-256-GCM.
                    However, no encryption system is infallible. We do not guarantee absolute security
                    of vault data.
                  </p>
                  <p>
                    In no event shall QlipLab or its developers be liable for any direct, indirect,
                    incidental, special, or consequential damages arising from the use of this software,
                    including but not limited to data loss or unauthorized data disclosure.
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
