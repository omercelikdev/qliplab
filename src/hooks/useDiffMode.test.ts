import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/window', () => ({
  expandWindowForPreview: vi.fn(),
  shrinkWindowFromPreview: vi.fn(),
}));

import { useDiffMode } from './useDiffMode';
import { useAppStore } from '@/stores/appStore';

describe('useDiffMode — history-tab gating', () => {
  beforeEach(() => {
    useAppStore.setState({ activeTab: 'history', isDiffMode: false, diffSelectedIds: [] });
  });
  afterEach(() => {
    useAppStore.setState({ activeTab: 'history', isDiffMode: false, diffSelectedIds: [] });
  });

  it('abandons an active diff when the tab leaves history', () => {
    act(() => useAppStore.setState({ isDiffMode: true, diffSelectedIds: ['a'] }));
    renderHook(() => useDiffMode());
    expect(useAppStore.getState().isDiffMode).toBe(true);

    act(() => useAppStore.setState({ activeTab: 'snippets' }));
    expect(useAppStore.getState().isDiffMode).toBe(false);
    expect(useAppStore.getState().diffSelectedIds).toEqual([]);
  });

  it('leaves diff mode alone while on the history tab', () => {
    act(() => useAppStore.setState({ isDiffMode: true, diffSelectedIds: ['a'] }));
    renderHook(() => useDiffMode());
    expect(useAppStore.getState().isDiffMode).toBe(true);
    expect(useAppStore.getState().diffSelectedIds).toEqual(['a']);
  });

  it('Alt+D does not start diff mode off the history tab', () => {
    act(() => useAppStore.setState({ activeTab: 'vault', isDiffMode: false }));
    renderHook(() => useDiffMode());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { altKey: true, code: 'KeyD', key: 'd' }));
    });
    expect(useAppStore.getState().isDiffMode).toBe(false);
  });

  it('Alt+D starts diff mode on the history tab', () => {
    act(() => useAppStore.setState({ activeTab: 'history', isDiffMode: false }));
    renderHook(() => useDiffMode());
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { altKey: true, code: 'KeyD', key: 'd' }));
    });
    expect(useAppStore.getState().isDiffMode).toBe(true);
  });
});
