import { CONFIG } from '@/lib/config';
import type { PremiumFeature, FeatureDef, EntitlementState } from '@/types/license';

export const FREE_HISTORY_LIMIT = 17;
export const FREE_VAULT_LIMIT = 2;
export const FREE_SNIPPET_LIMIT = 3;

export const PREMIUM_FEATURES: Record<PremiumFeature, FeatureDef> = {
  ai_actions: {
    id: 'ai_actions',
    labelKey: 'license.feature.aiActions',
    descriptionKey: 'license.feature.aiActionsDesc',
  },
  vault_unlimited: {
    id: 'vault_unlimited',
    labelKey: 'license.feature.vaultUnlimited',
    descriptionKey: 'license.feature.vaultUnlimitedDesc',
    freeLimit: FREE_VAULT_LIMIT,
  },
  ocr: {
    id: 'ocr',
    labelKey: 'license.feature.ocr',
    descriptionKey: 'license.feature.ocrDesc',
  },
  transform_chaining: {
    id: 'transform_chaining',
    labelKey: 'license.feature.transformChaining',
    descriptionKey: 'license.feature.transformChainingDesc',
  },
  snippet_variables: {
    id: 'snippet_variables',
    labelKey: 'license.feature.snippetVariables',
    descriptionKey: 'license.feature.snippetVariablesDesc',
  },
  html_paste: {
    id: 'html_paste',
    labelKey: 'license.feature.htmlPaste',
    descriptionKey: 'license.feature.htmlPasteDesc',
  },
  history_unlimited: {
    id: 'history_unlimited',
    labelKey: 'license.feature.historyUnlimited',
    descriptionKey: 'license.feature.historyUnlimitedDesc',
    freeLimit: FREE_HISTORY_LIMIT,
  },
  snippet_unlimited: {
    id: 'snippet_unlimited',
    labelKey: 'license.feature.snippetUnlimited',
    descriptionKey: 'license.feature.snippetUnlimitedDesc',
    freeLimit: FREE_SNIPPET_LIMIT,
  },
  diff_mode: {
    id: 'diff_mode',
    labelKey: 'license.feature.diffMode',
    descriptionKey: 'license.feature.diffModeDesc',
  },
  themes: {
    id: 'themes',
    labelKey: 'license.feature.themes',
    descriptionKey: 'license.feature.themesDesc',
  },
};

/**
 * Check if the current app version is a beta release.
 * Beta = version starts with 0.x.x or contains '-beta' suffix.
 * The store uses this to grant full access during beta.
 */
export function isBeta(version?: string): boolean {
  const v = version ?? CONFIG.APP_VERSION;
  if (v.includes('-beta')) return true;
  const major = parseInt(v.split('.')[0], 10);
  return !isNaN(major) && major === 0;
}

export interface FeatureContext {
  vaultItemCount?: number;
  snippetCount?: number;
}

/**
 * Check if a premium feature can be used given the current entitlement.
 * Note: Beta detection is handled at the store level — when isBeta(),
 * the store sets entitlement.isPremium = true with source 'beta'.
 */
export function canUseFeature(
  feature: PremiumFeature,
  entitlement: EntitlementState,
  context?: FeatureContext,
): boolean {
  if (entitlement.isPremium) return true;

  const def = PREMIUM_FEATURES[feature];

  // Vault: free tier allows up to FREE_VAULT_LIMIT items
  if (feature === 'vault_unlimited' && def.freeLimit !== undefined) {
    const count = context?.vaultItemCount ?? 0;
    return count < def.freeLimit;
  }

  // Snippets: free tier allows up to FREE_SNIPPET_LIMIT items
  if (feature === 'snippet_unlimited' && def.freeLimit !== undefined) {
    const count = context?.snippetCount ?? 0;
    return count < def.freeLimit;
  }

  // History: always usable, just capped — use getFeatureLimit for the cap
  if (feature === 'history_unlimited') {
    return true;
  }

  // All other premium features are locked on free tier
  return false;
}

/**
 * Get the effective limit for a feature. Returns null for unlimited (premium/beta).
 */
export function getFeatureLimit(
  feature: PremiumFeature,
  entitlement: EntitlementState,
): number | null {
  if (entitlement.isPremium) return null;

  const def = PREMIUM_FEATURES[feature];
  return def.freeLimit ?? null;
}

export const DEFAULT_ENTITLEMENT: EntitlementState = {
  isPremium: false,
  purchaseDate: null,
  productId: null,
  source: null,
};

export const BETA_ENTITLEMENT: EntitlementState = {
  isPremium: true,
  purchaseDate: null,
  productId: null,
  source: 'beta',
};
