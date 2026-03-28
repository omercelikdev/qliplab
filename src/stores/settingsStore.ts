import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';
import { encryptApiKey, decryptApiKey } from '@/lib/encryption';

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
  aiApiKey: string;
  aiProvider: 'anthropic' | 'openai' | 'gemini';
  aiConsentAccepted: boolean;
  aiConsentDate: string; // ISO date when consent was given
  snippetAutoExpand: boolean;
  onboardingSeen: boolean;
  globalShortcut: string; // e.g. 'CommandOrControl+Shift+V'
  autoCommands: AutoCommand[];
  launchOnLogin: boolean;
  eulaAccepted: boolean;
  eulaAcceptedVersion: string;
  eulaAcceptedAt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'system',
  theme: 'system',
  historyLimit: 100,
  autoLockMinutes: 5,
  sensitiveDetectionEnabled: true,
  storeImages: true,
  clearHistoryOnQuit: false,
  ignoredApps: [],
  expirationDays: 0,
  aiApiKey: '',
  aiProvider: 'anthropic',
  aiConsentAccepted: false,
  aiConsentDate: '',
  snippetAutoExpand: true,
  onboardingSeen: false,
  globalShortcut: 'CommandOrControl+Shift+V',
  autoCommands: [],
  launchOnLogin: true,
  eulaAccepted: false,
  eulaAcceptedVersion: '',
  eulaAcceptedAt: '',
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
      // Decrypt API key if stored encrypted
      if (savedSettings.aiApiKey) {
        try {
          savedSettings.aiApiKey = await decryptApiKey(savedSettings.aiApiKey as string);
        } catch {
          savedSettings.aiApiKey = ''; // Corrupted key, reset
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
      // Encrypt API key before persisting
      const persistValue = key === 'aiApiKey' && typeof value === 'string'
        ? await encryptApiKey(value)
        : value;
      await store.set(key, persistValue);
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
        // Encrypt API key before persisting
        const persistValue = key === 'aiApiKey' && typeof value === 'string'
          ? await encryptApiKey(value)
          : value;
        await store.set(key, persistValue);
      }
      await store.save();
      set((state) => ({ settings: { ...state.settings, ...updates } }));
    } catch {
      // Update settings failed
    }
  },
}));
