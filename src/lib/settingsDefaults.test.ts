import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '@/stores/settingsStore';

describe('DEFAULT_SETTINGS', () => {
  it('launchOnLogin defaults to false (Apple Guideline 2.4.5(iii) compliance)', () => {
    // Apps must NOT auto-launch without user consent
    expect(DEFAULT_SETTINGS.launchOnLogin).toBe(false);
  });

  it('has all required settings defined', () => {
    expect(DEFAULT_SETTINGS.language).toBe('system');
    expect(DEFAULT_SETTINGS.theme).toBe('system');
    expect(DEFAULT_SETTINGS.globalShortcut).toBe('Alt+Q');
    expect(DEFAULT_SETTINGS.sensitiveDetectionEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.storeImages).toBe(true);
    expect(DEFAULT_SETTINGS.clearHistoryOnQuit).toBe(false);
    expect(DEFAULT_SETTINGS.aiProvider).toBe('anthropic');
    expect(DEFAULT_SETTINGS.historyLimit).toBe(100);
  });
});
