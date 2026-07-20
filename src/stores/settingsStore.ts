import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';

export interface AutoCommand {
  id: string;
  format: string; // DetectedFormat value to match
  transformId: string; // Transform from TRANSFORM_REGISTRY
  enabled: boolean;
}

export interface AppSettings {
  language: 'system' | 'en' | 'tr' | 'ar' | 'de' | 'fr' | 'es' | 'pt' | 'zh' | 'ja' | 'ko' | 'ru' | 'it' | 'hi' | 'nl' | 'pl';
  theme: 'light' | 'dark' | 'system';
  historyLimit: number;
  autoLockMinutes: number;
  sensitiveDetectionEnabled: boolean;
  storeImages: boolean;
  clearHistoryOnQuit: boolean;
  ignoredApps: string[];
  expirationDays: number; // 0 = never
  snippetAutoExpand: boolean;
  onboardingSeen: boolean;
  /** First-run welcome wizard completed (or skipped). Distinct from
   *  onboardingSeen (the inline hint banner) so each can retire independently. */
  welcomeSeen: boolean;
  globalShortcut: string; // primary, e.g. 'CommandOrControl+Shift+V'
  /** Optional second toggle shortcut. Empty string = unset. Defaults to
   *  Ditto's Ctrl+` so migrants keep their muscle memory. */
  globalShortcut2: string;
  autoCommands: AutoCommand[];
  launchOnLogin: boolean;
  windowX: number | null;
  windowY: number | null;
  windowWidth: number | null;
  windowHeight: number | null;
  /** The window starts hidden, so on a fresh install nobody would ever see the
   *  app (no Dock icon either). Show it once, then never force it again. */
  firstRunShown: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'system',
  theme: 'system',
  historyLimit: 100,
  autoLockMinutes: 5,
  sensitiveDetectionEnabled: true,
  storeImages: true,
  clearHistoryOnQuit: false,
  ignoredApps: [],
  expirationDays: 0,
  snippetAutoExpand: true,
  onboardingSeen: false,
  welcomeSeen: false,
  // Alt+Q collided with typing '@' on Turkish keyboards (AltGr+Q), so the
  // default is a safe combo; Ctrl+` mirrors Ditto as the secondary.
  globalShortcut: 'CommandOrControl+Shift+V',
  globalShortcut2: 'Control+`',
  autoCommands: [],
  launchOnLogin: false,
  windowX: null,
  windowY: null,
  windowWidth: null,
  windowHeight: null,
  firstRunShown: false,
};

let store: Store | null = null;

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    try {
      store = await Store.load('settings.json');
      const savedSettings: Partial<AppSettings> = {};
      for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
        const value = await store.get(key);
        if (value !== null && value !== undefined) {
          (savedSettings as Record<string, unknown>)[key] = value;
        }
      }
      set({ settings: { ...DEFAULT_SETTINGS, ...savedSettings }, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    try {
      if (!store) return;
      await store.set(key, value);
      await store.save();
      set((state) => ({ settings: { ...state.settings, [key]: value } }));
    } catch {
      // Update setting failed
    }
  },

  updateSettings: async (updates) => {
    try {
      if (!store) return;
      for (const [key, value] of Object.entries(updates)) {
        await store.set(key, value);
      }
      await store.save();
      set((state) => ({ settings: { ...state.settings, ...updates } }));
    } catch {
      // Update settings failed
    }
  },
}));
