import { describe, it, expect } from 'vitest';
import {
  isBeta,
  canUseFeature,
  getFeatureLimit,
  FREE_HISTORY_LIMIT,
  FREE_VAULT_LIMIT,
  FREE_SNIPPET_LIMIT,
  PREMIUM_FEATURES,
  DEFAULT_ENTITLEMENT,
  BETA_ENTITLEMENT,
} from './license';
import type { EntitlementState } from '@/types/license';

const FREE: EntitlementState = { ...DEFAULT_ENTITLEMENT };
const PREMIUM: EntitlementState = {
  isPremium: true,
  purchaseDate: '2026-03-19T00:00:00Z',
  productId: 'com.qliplab.premium',
  source: 'license_key',
};

// ─── isBeta ────────────────────────────────────────────────────

describe('isBeta', () => {
  it('returns true for 0.x.x versions', () => {
    expect(isBeta('0.1.0')).toBe(true);
    expect(isBeta('0.0.1')).toBe(true);
    expect(isBeta('0.99.99')).toBe(true);
    expect(isBeta('0.0.0')).toBe(true);
  });

  it('returns true for versions with -beta suffix', () => {
    expect(isBeta('1.0.0-beta')).toBe(true);
    expect(isBeta('2.3.4-beta.1')).toBe(true);
    expect(isBeta('1.0.0-beta.2')).toBe(true);
    expect(isBeta('0.1.0-beta')).toBe(true);
  });

  it('returns false for release versions', () => {
    expect(isBeta('1.0.0')).toBe(false);
    expect(isBeta('2.0.0')).toBe(false);
    expect(isBeta('1.0.1')).toBe(false);
    expect(isBeta('10.5.3')).toBe(false);
  });

  it('returns false for non-beta pre-release suffixes', () => {
    expect(isBeta('1.0.0-alpha')).toBe(false);
    expect(isBeta('1.0.0-rc.1')).toBe(false);
  });

  it('uses CONFIG.APP_VERSION when no argument provided', () => {
    // CONFIG.APP_VERSION is '0.1.0' which is beta
    expect(isBeta()).toBe(true);
  });
});

// ─── canUseFeature ─────────────────────────────────────────────

describe('canUseFeature', () => {
  describe('premium entitlement', () => {
    it('grants all features', () => {
      expect(canUseFeature('ai_actions', PREMIUM)).toBe(true);
      expect(canUseFeature('vault_unlimited', PREMIUM)).toBe(true);
      expect(canUseFeature('vault_unlimited', PREMIUM, { vaultItemCount: 999 })).toBe(true);
      expect(canUseFeature('ocr', PREMIUM)).toBe(true);
      expect(canUseFeature('transform_chaining', PREMIUM)).toBe(true);
      expect(canUseFeature('snippet_variables', PREMIUM)).toBe(true);
      expect(canUseFeature('html_paste', PREMIUM)).toBe(true);
      expect(canUseFeature('history_unlimited', PREMIUM)).toBe(true);
      expect(canUseFeature('snippet_unlimited', PREMIUM)).toBe(true);
      expect(canUseFeature('snippet_unlimited', PREMIUM, { snippetCount: 999 })).toBe(true);
      expect(canUseFeature('diff_mode', PREMIUM)).toBe(true);
      expect(canUseFeature('themes', PREMIUM)).toBe(true);
    });
  });

  describe('beta entitlement', () => {
    it('grants all features (isPremium is true)', () => {
      expect(canUseFeature('ai_actions', BETA_ENTITLEMENT)).toBe(true);
      expect(canUseFeature('vault_unlimited', BETA_ENTITLEMENT, { vaultItemCount: 999 })).toBe(true);
      expect(canUseFeature('ocr', BETA_ENTITLEMENT)).toBe(true);
      expect(canUseFeature('transform_chaining', BETA_ENTITLEMENT)).toBe(true);
      expect(canUseFeature('snippet_variables', BETA_ENTITLEMENT)).toBe(true);
      expect(canUseFeature('html_paste', BETA_ENTITLEMENT)).toBe(true);
      expect(canUseFeature('history_unlimited', BETA_ENTITLEMENT)).toBe(true);
      expect(canUseFeature('snippet_unlimited', BETA_ENTITLEMENT, { snippetCount: 999 })).toBe(true);
      expect(canUseFeature('diff_mode', BETA_ENTITLEMENT)).toBe(true);
      expect(canUseFeature('themes', BETA_ENTITLEMENT)).toBe(true);
    });
  });

  describe('free entitlement', () => {
    it('locks AI actions', () => {
      expect(canUseFeature('ai_actions', FREE)).toBe(false);
    });

    it('locks OCR', () => {
      expect(canUseFeature('ocr', FREE)).toBe(false);
    });

    it('locks transform chaining', () => {
      expect(canUseFeature('transform_chaining', FREE)).toBe(false);
    });

    it('locks snippet variables', () => {
      expect(canUseFeature('snippet_variables', FREE)).toBe(false);
    });

    it('locks HTML paste', () => {
      expect(canUseFeature('html_paste', FREE)).toBe(false);
    });

    it('locks diff mode', () => {
      expect(canUseFeature('diff_mode', FREE)).toBe(false);
    });

    it('locks themes', () => {
      expect(canUseFeature('themes', FREE)).toBe(false);
    });

    it('allows vault when under free limit', () => {
      expect(canUseFeature('vault_unlimited', FREE, { vaultItemCount: 0 })).toBe(true);
      expect(canUseFeature('vault_unlimited', FREE, { vaultItemCount: 1 })).toBe(true);
    });

    it('locks vault when at or over free limit', () => {
      expect(canUseFeature('vault_unlimited', FREE, { vaultItemCount: 2 })).toBe(false);
      expect(canUseFeature('vault_unlimited', FREE, { vaultItemCount: 10 })).toBe(false);
    });

    it('allows vault with default context (0 items)', () => {
      expect(canUseFeature('vault_unlimited', FREE)).toBe(true);
    });

    it('allows snippets when under free limit', () => {
      expect(canUseFeature('snippet_unlimited', FREE, { snippetCount: 0 })).toBe(true);
      expect(canUseFeature('snippet_unlimited', FREE, { snippetCount: 2 })).toBe(true);
    });

    it('locks snippets when at or over free limit', () => {
      expect(canUseFeature('snippet_unlimited', FREE, { snippetCount: 3 })).toBe(false);
      expect(canUseFeature('snippet_unlimited', FREE, { snippetCount: 10 })).toBe(false);
    });

    it('allows snippets with default context (0 items)', () => {
      expect(canUseFeature('snippet_unlimited', FREE)).toBe(true);
    });

    it('allows history (always usable, just capped)', () => {
      expect(canUseFeature('history_unlimited', FREE)).toBe(true);
    });
  });
});

// ─── getFeatureLimit ───────────────────────────────────────────

describe('getFeatureLimit', () => {
  describe('premium entitlement', () => {
    it('returns null (unlimited) for all features', () => {
      expect(getFeatureLimit('history_unlimited', PREMIUM)).toBeNull();
      expect(getFeatureLimit('vault_unlimited', PREMIUM)).toBeNull();
      expect(getFeatureLimit('snippet_unlimited', PREMIUM)).toBeNull();
      expect(getFeatureLimit('ai_actions', PREMIUM)).toBeNull();
      expect(getFeatureLimit('ocr', PREMIUM)).toBeNull();
    });
  });

  describe('beta entitlement', () => {
    it('returns null (unlimited) for all features', () => {
      expect(getFeatureLimit('history_unlimited', BETA_ENTITLEMENT)).toBeNull();
      expect(getFeatureLimit('vault_unlimited', BETA_ENTITLEMENT)).toBeNull();
      expect(getFeatureLimit('snippet_unlimited', BETA_ENTITLEMENT)).toBeNull();
    });
  });

  describe('free entitlement', () => {
    it('returns 17 for history limit', () => {
      expect(getFeatureLimit('history_unlimited', FREE)).toBe(FREE_HISTORY_LIMIT);
      expect(getFeatureLimit('history_unlimited', FREE)).toBe(17);
    });

    it('returns 2 for vault limit', () => {
      expect(getFeatureLimit('vault_unlimited', FREE)).toBe(FREE_VAULT_LIMIT);
      expect(getFeatureLimit('vault_unlimited', FREE)).toBe(2);
    });

    it('returns 3 for snippet limit', () => {
      expect(getFeatureLimit('snippet_unlimited', FREE)).toBe(FREE_SNIPPET_LIMIT);
      expect(getFeatureLimit('snippet_unlimited', FREE)).toBe(3);
    });

    it('returns null for features without freeLimit', () => {
      expect(getFeatureLimit('ai_actions', FREE)).toBeNull();
      expect(getFeatureLimit('ocr', FREE)).toBeNull();
      expect(getFeatureLimit('transform_chaining', FREE)).toBeNull();
      expect(getFeatureLimit('snippet_variables', FREE)).toBeNull();
      expect(getFeatureLimit('html_paste', FREE)).toBeNull();
      expect(getFeatureLimit('diff_mode', FREE)).toBeNull();
      expect(getFeatureLimit('themes', FREE)).toBeNull();
    });
  });
});

// ─── PREMIUM_FEATURES registry ────────────────────────────────

describe('PREMIUM_FEATURES', () => {
  it('has all 10 premium features defined', () => {
    const features = Object.keys(PREMIUM_FEATURES);
    expect(features).toHaveLength(10);
    expect(features).toContain('ai_actions');
    expect(features).toContain('vault_unlimited');
    expect(features).toContain('ocr');
    expect(features).toContain('transform_chaining');
    expect(features).toContain('snippet_variables');
    expect(features).toContain('html_paste');
    expect(features).toContain('history_unlimited');
    expect(features).toContain('snippet_unlimited');
    expect(features).toContain('diff_mode');
    expect(features).toContain('themes');
  });

  it('has correct free limits', () => {
    expect(PREMIUM_FEATURES.vault_unlimited.freeLimit).toBe(2);
    expect(PREMIUM_FEATURES.history_unlimited.freeLimit).toBe(17);
    expect(PREMIUM_FEATURES.snippet_unlimited.freeLimit).toBe(3);
    expect(PREMIUM_FEATURES.ai_actions.freeLimit).toBeUndefined();
    expect(PREMIUM_FEATURES.ocr.freeLimit).toBeUndefined();
    expect(PREMIUM_FEATURES.transform_chaining.freeLimit).toBeUndefined();
    expect(PREMIUM_FEATURES.snippet_variables.freeLimit).toBeUndefined();
    expect(PREMIUM_FEATURES.html_paste.freeLimit).toBeUndefined();
    expect(PREMIUM_FEATURES.diff_mode.freeLimit).toBeUndefined();
    expect(PREMIUM_FEATURES.themes.freeLimit).toBeUndefined();
  });

  it('has i18n label keys for all features', () => {
    for (const def of Object.values(PREMIUM_FEATURES)) {
      expect(def.labelKey).toMatch(/^license\.feature\./);
      expect(def.descriptionKey).toMatch(/^license\.feature\./);
    }
  });
});

// ─── Constants ─────────────────────────────────────────────────

describe('constants', () => {
  it('FREE_HISTORY_LIMIT is 17', () => {
    expect(FREE_HISTORY_LIMIT).toBe(17);
  });

  it('FREE_VAULT_LIMIT is 2', () => {
    expect(FREE_VAULT_LIMIT).toBe(2);
  });

  it('FREE_SNIPPET_LIMIT is 3', () => {
    expect(FREE_SNIPPET_LIMIT).toBe(3);
  });

  it('DEFAULT_ENTITLEMENT is not premium', () => {
    expect(DEFAULT_ENTITLEMENT.isPremium).toBe(false);
    expect(DEFAULT_ENTITLEMENT.purchaseDate).toBeNull();
    expect(DEFAULT_ENTITLEMENT.productId).toBeNull();
    expect(DEFAULT_ENTITLEMENT.source).toBeNull();
  });

  it('BETA_ENTITLEMENT is premium with beta source', () => {
    expect(BETA_ENTITLEMENT.isPremium).toBe(true);
    expect(BETA_ENTITLEMENT.source).toBe('beta');
    expect(BETA_ENTITLEMENT.purchaseDate).toBeNull();
  });
});
