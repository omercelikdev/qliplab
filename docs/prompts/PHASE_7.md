# PHASE 7: Settings + Polish

> **First read:** `prompts/COMMON.md` for Master Instructions
> **Prerequisites:** PHASE 1-6 completed

---

## PROMPT

```
Continuing qliplab. This is PHASE 7 - Settings and final polish.

## READ FIRST
- CLAUDE.md
- docs/PROGRESS.md

## STEP 1: Settings Store

**src/stores/settingsStore.ts:**
```typescript
import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  historyLimit: number;
  autoLockMinutes: number;
  sensitiveDetectionEnabled: boolean;
  storeImages: boolean;
  clearHistoryOnQuit: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  historyLimit: 100,
  autoLockMinutes: 5,
  sensitiveDetectionEnabled: true,
  storeImages: true,
  clearHistoryOnQuit: false,
};

let store: Store | null = null;

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  
  loadSettings: async () => {
    store = await Store.load('settings.json');
    const savedSettings: Partial<AppSettings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      const value = await store.get<any>(key);
      if (value !== null) savedSettings[key] = value;
    }
    set({ settings: { ...DEFAULT_SETTINGS, ...savedSettings }, isLoading: false });
  },
  
  updateSetting: async (key, value) => {
    if (!store) return;
    await store.set(key, value);
    await store.save();
    set(state => ({ settings: { ...state.settings, [key]: value } }));
  },
}));
```

## STEP 2: Settings Dialog

**src/components/settings/SettingsDialog.tsx:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { X, Monitor, Moon, Sun } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';

interface Props { isOpen: boolean; onClose: () => void; }

export function SettingsDialog({ isOpen, onClose }: Props) {
  const { settings, updateSetting } = useSettingsStore();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="absolute inset-4 bg-background border border-border rounded-xl shadow-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            
            <div className="h-12 flex items-center justify-between px-4 border-b border-border">
              <h2 className="font-semibold">Settings</h2>
              <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-48px)]">
              {/* Theme */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme</label>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map(theme => (
                    <button key={theme} onClick={() => updateSetting('theme', theme)}
                      className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg border',
                        settings.theme === theme ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:bg-surface-hover')}>
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
                <select value={settings.historyLimit} onChange={e => updateSetting('historyLimit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm">
                  <option value={50}>50 items</option>
                  <option value={100}>100 items</option>
                  <option value={200}>200 items</option>
                  <option value={500}>500 items</option>
                </select>
              </div>
              
              {/* Auto Lock */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Vault Auto-lock</label>
                <select value={settings.autoLockMinutes} onChange={e => updateSetting('autoLockMinutes', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm">
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={0}>Never</option>
                </select>
              </div>
              
              {/* Toggles */}
              <div className="space-y-3">
                <ToggleSetting label="Detect sensitive data" description="Auto-detect passwords, API keys" checked={settings.sensitiveDetectionEnabled} onChange={v => updateSetting('sensitiveDetectionEnabled', v)} />
                <ToggleSetting label="Store images" description="Save copied images to history" checked={settings.storeImages} onChange={v => updateSetting('storeImages', v)} />
                <ToggleSetting label="Clear on quit" description="Delete non-pinned items on close" checked={settings.clearHistoryOnQuit} onChange={v => updateSetting('clearHistoryOnQuit', v)} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToggleSetting({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button onClick={() => onChange(!checked)} className={cn('w-10 h-6 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-hover')}>
        <div className={cn('w-4 h-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-1')} />
      </button>
    </div>
  );
}
```

## STEP 3: Update DragBar

**src/components/layout/DragBar.tsx:**
```typescript
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { cn } from '@/lib/utils';

export function DragBar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  return (
    <>
      <div className={cn('h-8 flex items-center justify-between px-3', 'drag-region border-b border-border/50')}>
        <div className="flex-1" />
        <button onClick={() => setIsSettingsOpen(true)} className="no-drag p-1 hover:bg-surface-hover rounded-md transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
```

## STEP 4: Theme Hook Update

Update **src/hooks/useTheme.ts** to use settingsStore:
```typescript
import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

export function useTheme() {
  const { settings } = useSettingsStore();
  
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', settings.theme === 'dark');
    }
  }, [settings.theme]);
}
```

## STEP 5: Update App.tsx

```typescript
import { useSettingsStore } from './stores/settingsStore';

function App() {
  const { loadSettings } = useSettingsStore();
  
  useEffect(() => {
    const init = async () => {
      await initDatabase();
      await loadSettings();  // Add this
      await loadItems();
    };
    init();
  }, []);
  
  // ... rest
}
```

## STEP 6: Welcome Screen (Optional)

**src/components/welcome/WelcomeScreen.tsx:**
```typescript
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { icon: Clipboard, title: 'Clipboard History', description: 'Everything you copy is saved automatically.' },
  { icon: Sparkles, title: 'Smart Transforms', description: 'Beautify JSON, decode JWT, format SQL with one click.' },
  { icon: Shield, title: 'Secure Vault', description: 'Store sensitive info encrypted with AES-256.' },
];

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else onComplete();
  };
  
  const step = steps[currentStep];
  const Icon = step.icon;
  
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <AnimatePresence mode="wait">
        <motion.div key={currentStep} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
          <div className="p-4 bg-accent/10 rounded-full inline-block mb-6"><Icon className="w-8 h-8 text-accent" /></div>
          <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{step.description}</p>
        </motion.div>
      </AnimatePresence>
      
      <div className="flex gap-2 mb-6 mt-8">
        {steps.map((_, i) => <div key={i} className={cn('w-2 h-2 rounded-full', i === currentStep ? 'bg-accent' : 'bg-surface')} />)}
      </div>
      
      <button onClick={handleNext} className={cn('flex items-center gap-2 px-4 py-2', 'bg-accent text-accent-foreground rounded-lg hover:bg-accent/90')}>
        {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
```

## OUTPUT CHECK

- ✅ Settings gear icon opens dialog
- ✅ Theme switch works (light/dark/system)
- ✅ Settings persist after restart
- ✅ Toggle switches work
- ✅ All dropdowns work

## TEST
1. Click settings gear
2. Change theme → UI updates
3. Close app, reopen → settings preserved
4. Toggle options work
```
