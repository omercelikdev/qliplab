import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  historyLimit: number;
  autoLockMinutes: number;
  sensitiveDetectionEnabled: boolean;
  storeImages: boolean;
  clearHistoryOnQuit: boolean;
  ignoredApps: string[];
  expirationDays: number; // 0 = never
  aiApiKey: string;
  aiProvider: 'anthropic' | 'openai';
  aiConsentAccepted: boolean;
  aiConsentDate: string; // ISO date when consent was given
  onboardingSeen: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
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
  onboardingSeen: false,
};

let store: Store | null = null;

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
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
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    try {
      if (!store) return;
      await store.set(key, value);
      await store.save();
      set((state) => ({ settings: { ...state.settings, [key]: value } }));
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  },
}));
