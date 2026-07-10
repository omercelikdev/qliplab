import { describe, it, expect } from 'vitest';
import {
  getSuggestedTransforms,
  transformMatchesQuery,
  buildTransformGroups,
  flattenGroups,
  getTransformById,
  TRANSFORM_REGISTRY,
} from './transformRegistry';

describe('getSuggestedTransforms', () => {
  // The whole point of the redesign: a typed clip suggests only what fits it.
  it('returns just the format-specific transforms for SQL', () => {
    const ids = getSuggestedTransforms('sql').map((t) => t.id);
    expect(ids).toEqual(['sql_format']);
  });

  it('returns every JSON-specific transform for JSON', () => {
    const ids = getSuggestedTransforms('json').map((t) => t.id);
    expect(ids).toContain('json_beautify');
    expect(ids).toContain('json_to_yaml');
    // ...and nothing universal like Base64 Encode.
    expect(ids).not.toContain('base64_encode');
  });

  it('suggests nothing format-specific for plain text', () => {
    expect(getSuggestedTransforms('plain')).toEqual([]);
  });
});

describe('transformMatchesQuery', () => {
  const sqlFormat = getTransformById('sql_format')!;
  const base64 = getTransformById('base64_encode')!;

  it('matches on the label, case-insensitively', () => {
    expect(transformMatchesQuery(sqlFormat, 'FORMAT')).toBe(true);
  });

  it('matches on the category', () => {
    expect(transformMatchesQuery(base64, 'encode')).toBe(true);
  });

  it('ignores spaces so "base 64" finds Base64', () => {
    expect(transformMatchesQuery(base64, 'base 64')).toBe(true);
  });

  it('rejects an unrelated query', () => {
    expect(transformMatchesQuery(sqlFormat, 'emoji')).toBe(false);
  });
});

describe('buildTransformGroups', () => {
  it('leads with Recent, then Suggested, then categories', () => {
    const groups = buildTransformGroups('sql', ['base64_encode'], '');
    expect(groups[0].key).toBe('recent');
    expect(groups[1].key).toBe('suggested');
    expect(groups[1].transforms.map((t) => t.id)).toEqual(['sql_format']);
    // The rest are category groups.
    expect(groups.slice(2).every((g) => g.key !== 'recent' && g.key !== 'suggested')).toBe(true);
  });

  it('omits the Recent group when there is no history', () => {
    const groups = buildTransformGroups('sql', [], '');
    expect(groups.find((g) => g.key === 'recent')).toBeUndefined();
    expect(groups[0].key).toBe('suggested');
  });

  it('omits the Suggested group for a format with no specific transforms', () => {
    const groups = buildTransformGroups('plain', [], '');
    expect(groups.find((g) => g.key === 'suggested')).toBeUndefined();
  });

  it('does not repeat a suggested transform in its category group', () => {
    const groups = buildTransformGroups('sql', [], '');
    const categoryIds = groups
      .filter((g) => g.key !== 'suggested' && g.key !== 'recent')
      .flatMap((g) => g.transforms.map((t) => t.id));
    expect(categoryIds).not.toContain('sql_format');
  });

  it('collapses to a single flat result list while searching', () => {
    const groups = buildTransformGroups('sql', ['base64_encode'], 'hash');
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('results');
    expect(groups[0].transforms.every((t) => t.category === 'Hash')).toBe(true);
  });

  it('returns no groups when the search matches nothing', () => {
    expect(buildTransformGroups('sql', [], 'zzzznope')).toEqual([]);
  });

  it('ignores recent ids that no longer exist in the registry', () => {
    const groups = buildTransformGroups('plain', ['deleted_transform_id'], '');
    expect(groups.find((g) => g.key === 'recent')).toBeUndefined();
  });
});

describe('flattenGroups', () => {
  it('preserves the visible order across groups', () => {
    const groups = buildTransformGroups('sql', ['base64_encode'], '');
    const flat = flattenGroups(groups);
    expect(flat[0].id).toBe('base64_encode'); // recent first
    expect(flat[1].id).toBe('sql_format'); // then suggested
    expect(flat.length).toBeGreaterThan(TRANSFORM_REGISTRY.length - 5);
  });
});
