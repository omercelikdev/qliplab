import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addRecentId, getRecentTransformIds, pushRecentTransform, MAX_RECENT_TRANSFORMS } from './recentTransforms';

describe('addRecentId', () => {
  it('puts a new id at the front', () => {
    expect(addRecentId(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('moves an existing id to the front without duplicating it', () => {
    expect(addRecentId(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('caps the list at the maximum, dropping the oldest', () => {
    const full = ['1', '2', '3', '4', '5'];
    expect(addRecentId(full, '6')).toEqual(['6', '1', '2', '3', '4']);
    expect(addRecentId(full, '6')).toHaveLength(MAX_RECENT_TRANSFORMS);
  });
});

describe('localStorage-backed recents', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });

  it('returns an empty list when nothing is stored', () => {
    expect(getRecentTransformIds()).toEqual([]);
  });

  it('round-trips through push and get, most-recent-first', () => {
    pushRecentTransform('sql_format');
    pushRecentTransform('json_beautify');
    expect(getRecentTransformIds()).toEqual(['json_beautify', 'sql_format']);
  });

  it('survives corrupt storage without throwing', () => {
    localStorage.setItem('qlip_recentTransforms', '{not json');
    expect(getRecentTransformIds()).toEqual([]);
  });

  it('ignores non-string entries from tampered storage', () => {
    localStorage.setItem('qlip_recentTransforms', JSON.stringify(['ok', 42, null, 'fine']));
    expect(getRecentTransformIds()).toEqual(['ok', 'fine']);
  });
});
