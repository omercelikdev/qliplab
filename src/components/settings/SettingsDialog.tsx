import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Monitor, Moon, Sun, MessageSquare, Shield } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { ReportIssueDialog } from '@/components/feedback/ReportIssueDialog';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: Props) {
  const settings = useSettingsStore((state) => state.settings);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  const { autoErrorReporting, setAutoErrorReporting, loadSettings } = useFeedbackStore();

  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  return (
    <>
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
                <h2 className="font-semibold">Settings</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-6 overflow-y-auto overflow-x-hidden h-[calc(100%-48px)]">
                {/* Theme */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <div className="flex gap-2">
                    {(['light', 'dark', 'system'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updateSetting('theme', theme)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors cursor-pointer',
                          settings.theme === theme
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border hover:bg-surface-hover'
                        )}
                      >
                        {theme === 'light' && <Sun className="w-4 h-4" />}
                        {theme === 'dark' && <Moon className="w-4 h-4" />}
                        {theme === 'system' && <Monitor className="w-4 h-4" />}
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* History Limit */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">History Limit</label>
                  <select
                    value={settings.historyLimit}
                    onChange={(e) => updateSetting('historyLimit', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value={50}>50 items</option>
                    <option value={100}>100 items</option>
                    <option value={200}>200 items</option>
                    <option value={500}>500 items</option>
                  </select>
                </div>

                {/* Auto Lock */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vault Auto-lock</label>
                  <select
                    value={settings.autoLockMinutes}
                    onChange={(e) => updateSetting('autoLockMinutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={0}>Never</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <ToggleSetting
                    label="Detect sensitive data"
                    description="Auto-detect passwords, API keys"
                    checked={settings.sensitiveDetectionEnabled}
                    onChange={(v) => updateSetting('sensitiveDetectionEnabled', v)}
                  />
                  <ToggleSetting
                    label="Store images"
                    description="Save copied images to history"
                    checked={settings.storeImages}
                    onChange={(v) => updateSetting('storeImages', v)}
                  />
                  <ToggleSetting
                    label="Clear on quit"
                    description="Delete non-pinned items on close"
                    checked={settings.clearHistoryOnQuit}
                    onChange={(v) => updateSetting('clearHistoryOnQuit', v)}
                  />
                </div>

                {/* Privacy & Reporting Section */}
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Privacy & Reporting</h3>
                  </div>

                  <ToggleSetting
                    label="Auto Error Reporting"
                    description="Automatically send crash reports"
                    checked={autoErrorReporting}
                    onChange={setAutoErrorReporting}
                  />
                </div>

                {/* Report Issue Button */}
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2.5 text-sm rounded-lg transition-colors cursor-pointer',
                      'bg-surface-hover hover:bg-border'
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Report Issue / Send Feedback
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReportIssueDialog isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'w-10 h-6 rounded-full transition-colors relative cursor-pointer',
          checked ? 'bg-accent' : 'bg-border'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all',
            checked ? 'left-5' : 'left-1'
          )}
        />
      </button>
    </div>
  );
}
