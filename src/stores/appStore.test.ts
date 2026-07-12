import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';

describe('appStore — capture pause', () => {
  beforeEach(() => {
    useAppStore.getState().setCapturePaused(false);
  });

  it('starts unpaused', () => {
    expect(useAppStore.getState().isCapturePaused).toBe(false);
  });

  it('toggles on and off', () => {
    useAppStore.getState().toggleCapturePaused();
    expect(useAppStore.getState().isCapturePaused).toBe(true);
    useAppStore.getState().toggleCapturePaused();
    expect(useAppStore.getState().isCapturePaused).toBe(false);
  });

  it('sets an explicit value', () => {
    useAppStore.getState().setCapturePaused(true);
    expect(useAppStore.getState().isCapturePaused).toBe(true);
    useAppStore.getState().setCapturePaused(false);
    expect(useAppStore.getState().isCapturePaused).toBe(false);
  });
});
