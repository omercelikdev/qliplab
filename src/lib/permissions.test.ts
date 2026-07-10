import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  isAccessibilityGranted,
  requestAccessibilityPermission,
  openAccessibilitySettings,
} from './permissions';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

describe('isAccessibilityGranted', () => {
  it('returns what the backend reports', async () => {
    mockInvoke.mockResolvedValue(true);
    await expect(isAccessibilityGranted()).resolves.toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('accessibility_granted');

    mockInvoke.mockResolvedValue(false);
    await expect(isAccessibilityGranted()).resolves.toBe(false);
  });

  // Never show a permission banner the user cannot act on.
  it('assumes granted when the command is unavailable', async () => {
    mockInvoke.mockRejectedValue(new Error('command not found'));
    await expect(isAccessibilityGranted()).resolves.toBe(true);
  });
});

describe('requestAccessibilityPermission', () => {
  it('returns the post-request permission state', async () => {
    mockInvoke.mockResolvedValue(true);
    await expect(requestAccessibilityPermission()).resolves.toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('request_accessibility_permission');
  });

  it('reports not granted when the request fails', async () => {
    mockInvoke.mockRejectedValue(new Error('denied'));
    await expect(requestAccessibilityPermission()).resolves.toBe(false);
  });
});

describe('openAccessibilitySettings', () => {
  it('invokes the backend command', async () => {
    mockInvoke.mockResolvedValue(undefined);
    await openAccessibilitySettings();
    expect(mockInvoke).toHaveBeenCalledWith('open_accessibility_settings');
  });

  it('never throws when the pane cannot be opened', async () => {
    mockInvoke.mockRejectedValue(new Error('no opener'));
    await expect(openAccessibilitySettings()).resolves.toBeUndefined();
  });
});
