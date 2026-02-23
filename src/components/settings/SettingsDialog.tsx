import { useState, useEffect } from 'react';
import { X, Monitor, Moon, Sun, MessageSquare, Shield, FileText, Plus, Bot, Eye, EyeOff, ShieldCheck, ShieldX, Download, Upload, Check, Keyboard, Zap, Trash2, Info } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore, type AutoCommand } from '@/stores/settingsStore';
import { EulaViewerDialog } from '@/components/legal/EulaViewerDialog';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { ReportIssueDialog } from '@/components/feedback/ReportIssueDialog';
import { PrivacyPolicyDialog } from '@/components/settings/PrivacyPolicyDialog';
import { AiConsentDialog } from '@/components/settings/AiConsentDialog';
import { recordConsent } from '@/lib/consentLog';
import { exportData, importData, type ExportSection } from '@/lib/exportImport';
import { TRANSFORM_REGISTRY } from '@/lib/transformRegistry';
import { CONFIG } from '@/lib/config';
import { cn } from '@/lib/utils';

export function SettingsPanel() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  const { autoErrorReporting, setAutoErrorReporting, loadSettings } = useFeedbackStore();

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAiConsentOpen, setIsAiConsentOpen] = useState(false);
  const [isEulaOpen, setIsEulaOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-4 py-3 space-y-5">
            {/* Theme */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">Theme</label>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSetting('theme', theme)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer',
                      settings.theme === theme
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:bg-surface-hover'
                    )}
                  >
                    {theme === 'light' && <Sun className="w-3.5 h-3.5" />}
                    {theme === 'dark' && <Moon className="w-3.5 h-3.5" />}
                    {theme === 'system' && <Monitor className="w-3.5 h-3.5" />}
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* History Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">History Limit</label>
              <select
                value={settings.historyLimit}
                onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) updateSetting('historyLimit', v); }}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded-md text-xs outline-none focus:ring-2 focus:ring-accent"
              >
                <option value={100}>100 items</option>
                <option value={200}>200 items</option>
                <option value={500}>500 items</option>
                <option value={1000}>1,000 items</option>
                <option value={5000}>5,000 items</option>
                <option value={10000}>10,000 items</option>
                <option value={50000}>50,000 items</option>
                <option value={100000}>100,000 items</option>
                <option value={500000}>500,000 items</option>
                <option value={1000000}>1,000,000 items</option>
              </select>
            </div>

            {/* Auto Lock */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">Vault Auto-lock</label>
              <select
                value={settings.autoLockMinutes}
                onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) updateSetting('autoLockMinutes', v); }}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded-md text-xs outline-none focus:ring-2 focus:ring-accent"
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
              <ToggleSetting
                label="Snippet auto-expand"
                description="Type a trigger anywhere to auto-paste snippet"
                checked={settings.snippetAutoExpand}
                onChange={(v) => updateSetting('snippetAutoExpand', v)}
              />
            </div>

            {/* Auto-Commands */}
            <div className="dotted-separator" />
            <AutoCommandsSection
              commands={settings.autoCommands}
              onChange={(cmds) => updateSetting('autoCommands', cmds)}
            />

            {/* Clip Expiration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">Auto-delete old clips</label>
              <select
                value={settings.expirationDays}
                onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) updateSetting('expirationDays', v); }}
                className="w-full px-3 py-1.5 bg-surface border border-border rounded-md text-xs outline-none focus:ring-2 focus:ring-accent"
              >
                <option value={0}>Never</option>
                <option value={7}>After 7 days</option>
                <option value={14}>After 14 days</option>
                <option value={30}>After 30 days</option>
                <option value={90}>After 90 days</option>
              </select>
            </div>

            {/* Global Shortcut */}
            <ShortcutSetting
              shortcut={settings.globalShortcut}
              onChange={(s) => updateSetting('globalShortcut', s)}
            />

            {/* Ignored Apps */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">Ignored Apps</label>
              <p className="text-[10px] text-muted-foreground">Clipboard from these apps won't be captured</p>
              <IgnoredAppsList
                apps={settings.ignoredApps}
                onChange={(apps) => updateSetting('ignoredApps', apps)}
              />
            </div>

            {/* AI Settings */}
            <div className="dotted-separator" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">AI Features</span>
              </div>

              {/* Consent Status */}
              <div className={cn(
                'flex items-center justify-between p-2 rounded-md border text-xs',
                settings.aiConsentAccepted
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-yellow-500/30 bg-yellow-500/5'
              )}>
                <div className="flex items-center gap-2">
                  {settings.aiConsentAccepted ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <ShieldX className="w-3.5 h-3.5 text-yellow-500" />
                  )}
                  <div>
                    <span className="text-[11px] font-medium">
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
                    className="px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                  >
                    Revoke
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAiConsentOpen(true)}
                    className="px-2 py-0.5 text-[10px] text-accent hover:bg-accent/10 rounded transition-colors cursor-pointer"
                  >
                    Review & Accept
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium">Provider</label>
                <select
                  value={settings.aiProvider}
                  onChange={(e) => updateSetting('aiProvider', e.target.value as 'anthropic' | 'openai')}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-md text-xs outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                </select>
              </div>

              <ApiKeyInput
                apiKey={settings.aiApiKey}
                onChange={(key) => updateSetting('aiApiKey', key)}
              />

              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">
                  API key is stored locally and never sent anywhere except the provider.
                </p>
                <p className="text-[10px] text-yellow-500">
                  AI actions are blocked for items containing sensitive data. A confirmation is shown before any data is sent.
                </p>
              </div>
            </div>

            {/* Data Management */}
            <div className="dotted-separator" />
            <DataManagement />

            {/* Privacy & Reporting Section */}
            <div className="dotted-separator" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">Privacy & Reporting</span>
              </div>

              <ToggleSetting
                label="Auto Error Reporting"
                description="Automatically send crash reports"
                checked={autoErrorReporting}
                onChange={setAutoErrorReporting}
              />
            </div>

            {/* Report Issue & Privacy — at bottom of scroll */}
            <div className="dotted-separator" />
            <div className="space-y-2">
              <button
                onClick={() => setIsReportOpen(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
                  'bg-surface-hover hover:bg-border'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Report Issue / Send Feedback
              </button>
              <button
                onClick={() => setIsPrivacyOpen(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-1 text-[11px] rounded-md transition-colors cursor-pointer',
                  'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                )}
              >
                <FileText className="w-3 h-3" />
                Privacy Policy
              </button>
              <button
                onClick={() => setIsEulaOpen(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-1 text-[11px] rounded-md transition-colors cursor-pointer',
                  'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                )}
              >
                <FileText className="w-3 h-3" />
                Terms of Use
              </button>
            </div>

            {/* About */}
            <div className="dotted-separator" />
            <div className="space-y-2 pb-2">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">About</span>
              </div>
              <div className="text-center space-y-1.5 py-2">
                <div className="text-sm font-semibold">QlipLab</div>
                <div className="text-[10px] text-muted-foreground">v{CONFIG.APP_VERSION}</div>
                <div className="text-[10px] text-muted-foreground">
                  Cross-platform clipboard manager
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportIssueDialog isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
      <PrivacyPolicyDialog isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <AiConsentDialog
        isOpen={isAiConsentOpen}
        onClose={() => setIsAiConsentOpen(false)}
        onAccept={() => setIsAiConsentOpen(false)}
        provider={settings.aiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'}
      />
      <EulaViewerDialog isOpen={isEulaOpen} onClose={() => setIsEulaOpen(false)} />
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
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0',
          checked ? 'bg-accent' : 'bg-border'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-background shadow-sm transition-all',
            checked ? 'left-[18px]' : 'left-0.5'
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
      <label className="text-[11px] font-medium">API Key</label>
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
            'w-full px-3 py-1.5 pr-9 bg-surface border border-border rounded-md text-[11px] font-mono',
            'outline-none focus:ring-2 focus:ring-accent'
          )}
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
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

function ShortcutSetting({
  shortcut,
  onChange,
}: {
  shortcut: string;
  onChange: (s: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [display, setDisplay] = useState('');

  const formatShortcut = (s: string) => {
    return s
      .replace('CommandOrControl', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl')
      .replace('Shift', 'Shift')
      .replace('Alt', navigator.platform.includes('Mac') ? 'Option' : 'Alt')
      .replace(/\+/g, ' + ');
  };

  // Use global keydown listener so modifier keys (Cmd, Ctrl) don't steal focus
  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // ESC cancels recording
      if (e.key === 'Escape') {
        setIsRecording(false);
        return;
      }

      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');

      const key = e.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        parts.push(key.length === 1 ? key.toUpperCase() : key);
        const newShortcut = parts.join('+');
        onChange(newShortcut);
        setIsRecording(false);
        setDisplay(formatShortcut(newShortcut));
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRecording, onChange]);

  useEffect(() => {
    setDisplay(formatShortcut(shortcut));
  }, [shortcut]);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">
        <div className="flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5" />
          Global Shortcut
        </div>
      </label>
      <button
        className={cn(
          'w-full px-3 py-1.5 text-xs rounded-md border text-left font-mono transition-colors cursor-pointer',
          isRecording
            ? 'border-accent bg-accent/10 text-accent animate-pulse'
            : 'border-border bg-surface hover:bg-surface-hover'
        )}
        onClick={() => setIsRecording(!isRecording)}
      >
        {isRecording ? 'Press shortcut...' : display}
      </button>
      <p className="text-[10px] text-muted-foreground">
        {isRecording ? 'Press ESC to cancel' : 'Click to record a new shortcut'}
      </p>
    </div>
  );
}

function DataManagement() {
  const [exportSections, setExportSections] = useState<ExportSection[]>(['history', 'snippets', 'vault']);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toggleSection = (section: ExportSection) => {
    setExportSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleExport = async () => {
    if (exportSections.length === 0) return;
    try {
      const success = await exportData(exportSections);
      if (success) setStatus({ type: 'success', message: 'Data exported successfully' });
    } catch (e) {
      setStatus({ type: 'error', message: `Export failed: ${(e as Error).message}` });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleImport = async () => {
    try {
      const result = await importData();
      if (result) {
        const parts = result.imported.map(s => `${s}: ${result.counts[s]}`);
        setStatus({ type: 'success', message: `Imported ${parts.join(', ')}` });
      }
    } catch (e) {
      setStatus({ type: 'error', message: `Import failed: ${(e as Error).message}` });
    }
    setTimeout(() => setStatus(null), 5000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Download className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">Data Management</span>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">Select sections to export</p>
        <div className="flex gap-2">
          {(['history', 'snippets', 'vault'] as ExportSection[]).map(section => (
            <button
              key={section}
              onClick={() => toggleSection(section)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md border transition-colors cursor-pointer',
                exportSections.includes(section)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border hover:bg-surface-hover'
              )}
            >
              {exportSections.includes(section) && <Check className="w-3 h-3" />}
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={exportSections.length === 0}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
            'bg-surface-hover hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        <button
          onClick={handleImport}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
            'bg-surface-hover hover:bg-border'
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          Import
        </button>
      </div>

      {status && (
        <p className={cn(
          'text-[10px] text-center py-1 rounded',
          status.type === 'success' ? 'text-green-500 bg-green-500/10' : 'text-destructive bg-destructive/10'
        )}>
          {status.message}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground">
        Vault items are exported encrypted. Import merges data without duplicates.
      </p>
    </div>
  );
}

const FORMAT_OPTIONS = [
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'csv', label: 'CSV' },
  { value: 'xml', label: 'XML' },
  { value: 'sql', label: 'SQL' },
  { value: 'base64', label: 'Base64' },
  { value: 'jwt', label: 'JWT' },
  { value: 'hex', label: 'Hex' },
  { value: 'url', label: 'URL' },
  { value: 'url_encoded', label: 'URL Encoded' },
  { value: 'html', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'code_js', label: 'JavaScript' },
  { value: 'code_ts', label: 'TypeScript' },
  { value: 'code_python', label: 'Python' },
];

function AutoCommandsSection({
  commands,
  onChange,
}: {
  commands: AutoCommand[];
  onChange: (cmds: AutoCommand[]) => void;
}) {
  const addCommand = () => {
    const id = `ac_${Date.now()}`;
    onChange([...commands, { id, format: 'json', transformId: 'json_beautify', enabled: true }]);
  };

  const removeCommand = (id: string) => {
    onChange(commands.filter(c => c.id !== id));
  };

  const updateCommand = (id: string, updates: Partial<AutoCommand>) => {
    onChange(commands.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // Filter transforms relevant to a given format
  const getTransformsForFormat = (format: string) => {
    return TRANSFORM_REGISTRY.filter(t =>
      t.relevantFormats.length === 0 || t.relevantFormats.includes(format as never)
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-foreground/40">Auto-Commands</span>
        </div>
        <button
          onClick={addCommand}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-accent hover:bg-accent/10 rounded transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add Rule
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Automatically transform clipboard content when a specific format is detected.
      </p>

      {commands.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50 text-center py-2">
          No auto-commands configured
        </p>
      ) : (
        <div className="space-y-2">
          {commands.map(cmd => (
            <div
              key={cmd.id}
              className={cn(
                'flex items-center gap-2 p-2 rounded-md border text-[11px]',
                cmd.enabled ? 'border-border bg-surface' : 'border-border/50 bg-surface/50 opacity-60'
              )}
            >
              <button
                onClick={() => updateCommand(cmd.id, { enabled: !cmd.enabled })}
                className={cn(
                  'w-7 h-4 rounded-full transition-colors relative cursor-pointer shrink-0',
                  cmd.enabled ? 'bg-accent' : 'bg-border'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-3 h-3 rounded-full bg-background shadow-sm transition-all',
                  cmd.enabled ? 'left-[14px]' : 'left-0.5'
                )} />
              </button>

              <select
                value={cmd.format}
                onChange={(e) => {
                  const newFormat = e.target.value;
                  const available = getTransformsForFormat(newFormat);
                  updateCommand(cmd.id, {
                    format: newFormat,
                    transformId: available[0]?.id || cmd.transformId,
                  });
                }}
                className="flex-1 px-1.5 py-0.5 bg-surface border border-border rounded text-[10px] outline-none"
              >
                {FORMAT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <span className="text-muted-foreground shrink-0">→</span>

              <select
                value={cmd.transformId}
                onChange={(e) => updateCommand(cmd.id, { transformId: e.target.value })}
                className="flex-1 px-1.5 py-0.5 bg-surface border border-border rounded text-[10px] outline-none"
              >
                {getTransformsForFormat(cmd.format).map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>

              <button
                onClick={() => removeCommand(cmd.id)}
                className="p-0.5 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
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
  const [allApps, setAllApps] = useState<{ name: string; running: boolean }[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const loadApps = async () => {
    try {
      const result = await invoke<[string, boolean][]>('list_running_apps');
      setAllApps(result.map(([name, running]) => ({ name, running })));
    } catch {
      setAllApps([]);
    }
  };

  const handlePickerToggle = () => {
    if (!isPickerOpen) loadApps();
    setIsPickerOpen(!isPickerOpen);
    setFilterText('');
  };

  const handleAddApp = (app: string) => {
    if (!apps.includes(app)) {
      onChange([...apps, app]);
    }
  };

  const handleRemove = (app: string) => {
    onChange(apps.filter((a) => a !== app));
  };

  const filteredApps = allApps.filter(
    (app) => !apps.includes(app.name) && app.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handlePickerToggle}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-accent hover:bg-accent/10 rounded-md transition-colors cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        {isPickerOpen ? 'Close' : 'Add app'}
      </button>

      {isPickerOpen && (
        <div className="border border-border rounded-md overflow-hidden">
          <input
            type="text"
            placeholder="Search apps..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-surface border-b border-border text-[11px] outline-none focus:ring-1 focus:ring-accent"
            autoFocus
          />
          <div className="max-h-[150px] overflow-y-auto">
            {filteredApps.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-2">
                {allApps.length === 0 ? 'Loading...' : 'No apps found'}
              </p>
            ) : (
              filteredApps.map((app) => (
                <button
                  key={app.name}
                  onClick={() => handleAddApp(app.name)}
                  className="w-full px-2.5 py-1 text-left text-[11px] hover:bg-surface-hover transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {app.running && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                  <span className={app.running ? 'text-foreground' : 'text-muted-foreground'}>{app.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {apps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {apps.map((app) => (
            <span
              key={app}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface border border-border rounded-full text-[11px]"
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
