import { describe, it, expect, vi, beforeEach } from 'vitest';
import { skipNextClipboard } from '@/hooks/useClipboardListener';

describe('skipNextClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('is a callable function', () => {
    expect(typeof skipNextClipboard).toBe('function');
  });

  it('does not throw when called', () => {
    expect(() => skipNextClipboard()).not.toThrow();
  });

  it('can be called multiple times without error', () => {
    skipNextClipboard();
    skipNextClipboard();
    skipNextClipboard();
    // No assertion needed — just verifying no crash
  });
});
