import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Monitor, Moon, Sun, MessageSquare, Shield, FileText, Plus, Bot, Eye, EyeOff, ShieldCheck, ShieldX } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { ReportIssueDialog } from '@/components/feedback/ReportIssueDialog';
import { PrivacyPolicyDialog } from '@/components/settings/PrivacyPolicyDialog';
import { AiConsentDialog } from '@/components/settings/AiConsentDialog';
import { recordConsent } from '@/lib/consentLog';
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
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAiConsentOpen, setIsAiConsentOpen] = useState(false);

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

                {/* Clip Expiration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-delete old clips</label>
                  <select
                    value={settings.expirationDays}
                    onChange={(e) => updateSetting('expirationDays', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value={0}>Never</option>
                    <option value={7}>After 7 days</option>
                    <option value={14}>After 14 days</option>
                    <option value={30}>After 30 days</option>
                    <option value={90}>After 90 days</option>
                  </select>
                </div>

                {/* Ignored Apps */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ignored Apps</label>
                  <p className="text-xs text-muted-foreground">Clipboard from these apps won't be captured (e.g. 1Password, KeePass)</p>
                  <IgnoredAppsList
                    apps={settings.ignoredApps}
                    onChange={(apps) => updateSetting('ignoredApps', apps)}
                  />
                </div>

                {/* AI Settings */}
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">AI Features</h3>
                  </div>

                  {/* Consent Status */}
                  <div className={cn(
                    'flex items-center justify-between p-2.5 rounded-lg border text-xs',
                    settings.aiConsentAccepted
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-yellow-500/30 bg-yellow-500/5'
                  )}>
                    <div className="flex items-center gap-2">
                      {settings.aiConsentAccepted ? (
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                      ) : (
                        <ShieldX className="w-4 h-4 text-yellow-500" />
                      )}
                      <div>
                        <span className="font-medium">
                          {settings.aiConsentAccepted ? 'AI Consent Granted' : 'AI Consent Required'}
                        </span>
                        {settings.aiConsentAccepted && settings.aiConsentDate && (
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            ({new Date(settings.aiConsentDate).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    </div>
                    {settings.aiConsentAccepted ? (
                      <button
                        onClick={async () => {
                          await recordConsent('revoke', settings.aiProvider);
                          updateSetting('aiConsentAccepted', false);
                          updateSetting('aiConsentDate', '');
                        }}
                        className="px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsAiConsentOpen(true)}
                        className="px-2 py-1 text-[10px] text-accent hover:bg-accent/10 rounded transition-colors cursor-pointer"
                      >
                        Review & Accept
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Provider</label>
                    <select
                      value={settings.aiProvider}
                      onChange={(e) => updateSetting('aiProvider', e.target.value as 'anthropic' | 'openai')}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI (GPT)</option>
                    </select>
                  </div>

                  <ApiKeyInput
                    apiKey={settings.aiApiKey}
                    onChange={(key) => updateSetting('aiApiKey', key)}
                  />

                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      API key is stored locally and never sent anywhere except the provider.
                    </p>
                    <p className="text-[10px] text-yellow-500">
                      AI actions are automatically blocked for items containing sensitive data
                      (passwords, API keys, credit cards, etc.). A confirmation dialog is shown
                      before any data is sent.
                    </p>
                  </div>
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

                {/* Report Issue & Privacy */}
                <div className="pt-4 border-t border-border space-y-2">
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
                  <button
                    onClick={() => setIsPrivacyOpen(true)}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2 text-xs rounded-lg transition-colors cursor-pointer',
                      'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Privacy Policy
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReportIssueDialog isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
      <PrivacyPolicyDialog isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <AiConsentDialog
        isOpen={isAiConsentOpen}
        onClose={() => setIsAiConsentOpen(false)}
        onAccept={() => setIsAiConsentOpen(false)}
        provider={settings.aiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'}
      />
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

function ApiKeyInput({
  apiKey,
  onChange,
}: {
  apiKey: string;
  onChange: (key: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);

  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  const handleBlur = () => {
    if (localKey !== apiKey) {
      onChange(localKey);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">API Key</label>
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={localKey}
          onChange={(e) => setLocalKey(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBlur();
          }}
          placeholder="sk-ant-... or sk-..."
          className={cn(
            'w-full px-3 py-2 pr-10 bg-surface border border-border rounded-lg text-xs font-mono',
            'outline-none focus:ring-2 focus:ring-accent'
          )}
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
        >
          {showKey ? (
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

function IgnoredAppsList({
  apps,
  onChange,
}: {
  apps: string[];
  onChange: (apps: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const value = inputRef.current?.value.trim();
    if (value && !apps.includes(value)) {
      onChange([...apps, value]);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (app: string) => {
    onChange(apps.filter((a) => a !== app));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          placeholder="App name..."
          className="flex-1 px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-accent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-2 py-1.5 bg-surface-hover hover:bg-border rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {apps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {apps.map((app) => (
            <span
              key={app}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface border border-border rounded-full text-xs"
            >
              {app}
              <button
                onClick={() => handleRemove(app)}
                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
