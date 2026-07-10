import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { isFrontmostAppSupported } from './capabilities';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const mockInvoke = vi.mocked(invoke);
// Block body on purpose: mockReset() returns the mock, and an arrow that
// returns a function makes Vitest treat it as a teardown hook — it would then
// call the mock after the test and leave a rejected promise unhandled.
beforeEach(() => {
  mockInvoke.mockReset();
});

describe('isFrontmostAppSupported', () => {
  it('reports what the backend says', async () => {
    mockInvoke.mockResolvedValue(true);
    await expect(isFrontmostAppSupported()).resolves.toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('frontmost_app_supported');

    mockInvoke.mockResolvedValue(false);
    await expect(isFrontmostAppSupported()).resolves.toBe(false);
  });

  it('treats a non-boolean answer as unsupported', async () => {
    mockInvoke.mockResolvedValue(undefined);
    await expect(isFrontmostAppSupported()).resolves.toBe(false);
  });

  // Never warn about something the user cannot fix.
  it('assumes supported when the command is unavailable', async () => {
    mockInvoke.mockRejectedValue(new Error('unknown command'));
    await expect(isFrontmostAppSupported()).resolves.toBe(true);
  });
});
