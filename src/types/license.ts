export type PremiumFeature =
  | 'ai_actions'
  | 'vault_unlimited'
  | 'ocr'
  | 'transform_chaining'
  | 'snippet_variables'
  | 'html_paste'
  | 'history_unlimited'
  | 'snippet_unlimited'
  | 'diff_mode'
  | 'themes';

export interface FeatureDef {
  id: PremiumFeature;
  labelKey: string;
  descriptionKey: string;
  freeLimit?: number;
}

export type EntitlementSource = 'storekit' | 'windows_store' | 'beta';

export interface EntitlementState {
  isPremium: boolean;
  purchaseDate: string | null;
  productId: string | null;
  source: EntitlementSource | null;
}
