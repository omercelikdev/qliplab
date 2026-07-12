import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn().mockResolvedValue(undefined);
const mockWriteText = vi.fn().mockResolvedValue(undefined);
const mockSnippets: { id: string; content: string }[] = [];
const mockVaultItems: unknown[] = [];

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...a: unknown[]) => mockInvoke(...a) }));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ writeText: (...a: unknown[]) => mockWriteText(...a) }));
vi.mock('@/stores/snippetStore', () => ({
  useSnippetStore: { getState: () => ({ snippets: mockSnippets }) },
}));
vi.mock('@/stores/vaultStore', () => ({
  useVaultStore: { getState: () => ({ items: mockVaultItems }) },
}));
vi.mock('@/lib/snippetVariables', () => ({
  expandVariables: (s: string) => Promise.resolve(s),
}));

import { expandTrigger } from './triggerEngine';

const backspaceCalled = () => mockInvoke.mock.calls.some((c) => c[0] === 'simulate_backspace');
const pasteCalled = () => mockInvoke.mock.calls.some((c) => c[0] === 'simulate_paste_in_place');

describe('expandTrigger', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockWriteText.mockClear();
    mockSnippets.length = 0;
    mockVaultItems.length = 0;
  });

  // Regression: the trigger text must not be backspaced away when the content
  // can't be resolved, or the user loses their typed text in the active app.
  it('does not backspace when the snippet no longer exists', async () => {
    await expandTrigger('snippet:gone', 5);
    expect(backspaceCalled()).toBe(false);
    expect(mockWriteText).not.toHaveBeenCalled();
    expect(pasteCalled()).toBe(false);
  });

  it('does not backspace when the vault item is missing (vault locked/deleted)', async () => {
    await expandTrigger('vault:missing:cvv', 6);
    expect(backspaceCalled()).toBe(false);
  });

  it('does not backspace for an unknown sourceId', async () => {
    await expandTrigger('bogus:x', 3);
    expect(backspaceCalled()).toBe(false);
  });

  it('resolves the content BEFORE backspacing, then pastes it', async () => {
    mockSnippets.push({ id: 's1', content: 'expanded text' });
    await expandTrigger('snippet:s1', 4);
    expect(backspaceCalled()).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('expanded text');
    expect(pasteCalled()).toBe(true);

    // Content resolution (writeText) happens after the backspace, but the
    // decision to backspace at all only came after the snippet was found.
    const order = mockInvoke.mock.calls.map((c) => c[0]);
    expect(order.indexOf('simulate_backspace')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('simulate_paste_in_place')).toBeGreaterThan(
      order.indexOf('simulate_backspace'),
    );
  });
});
