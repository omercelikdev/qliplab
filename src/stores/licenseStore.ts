import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';
import type { EntitlementState, PremiumFeature } from '@/types/license';
import {
  isBeta,
  canUseFeature,
  getFeatureLimit,
  DEFAULT_ENTITLEMENT,
  BETA_ENTITLEMENT,
  type FeatureContext,
} from '@/lib/license';

interface LicenseState {
  entitlement: EntitlementState;
  isLoading: boolean;
  isPurchasing: boolean;
  error: string | null;

  checkEntitlement: () => Promise<void>;
  purchasePremium: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  canUse: (feature: PremiumFeature, context?: FeatureContext) => boolean;
  getLimit: (feature: PremiumFeature) => number | null;
}

let licenseStore: Store | null = null;

export const useLicenseStore = create<LicenseState>((set, get) => ({
  entitlement: isBeta() ? BETA_ENTITLEMENT : DEFAULT_ENTITLEMENT,
  isLoading: !isBeta(),
  isPurchasing: false,
  error: null,

  checkEntitlement: async () => {
    // Beta mode: always full access, no need to check store
    if (isBeta()) {
      set({ entitlement: BETA_ENTITLEMENT, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Try platform IAP first
      const result = await invoke<string>('check_entitlement');
      const entitlement: EntitlementState = JSON.parse(result);

      // Cache for offline use
      licenseStore = await Store.load('license.json');
      await licenseStore.set('entitlement', entitlement);
      await licenseStore.save();

      set({ entitlement, isLoading: false });
    } catch {
      // Fallback to cached entitlement (offline support)
      try {
        licenseStore = await Store.load('license.json');
        const cached = await licenseStore.get('entitlement') as EntitlementState | null;
        if (cached) {
          set({ entitlement: cached, isLoading: false });
        } else {
          set({ entitlement: DEFAULT_ENTITLEMENT, isLoading: false });
        }
      } catch {
        set({ entitlement: DEFAULT_ENTITLEMENT, isLoading: false });
      }
    }
  },

  purchasePremium: async () => {
    set({ isPurchasing: true, error: null });

    try {
      const result = await invoke<string>('purchase_premium');
      const entitlement: EntitlementState = JSON.parse(result);

      // Cache the purchase
      if (!licenseStore) {
        licenseStore = await Store.load('license.json');
      }
      await licenseStore.set('entitlement', entitlement);
      await licenseStore.save();

      set({ entitlement, isPurchasing: false });
      return entitlement.isPremium;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isPurchasing: false, error: message });
      return false;
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await invoke<string>('restore_purchases');
      const entitlement: EntitlementState = JSON.parse(result);

      // Cache the restored purchase
      if (!licenseStore) {
        licenseStore = await Store.load('license.json');
      }
      await licenseStore.set('entitlement', entitlement);
      await licenseStore.save();

      set({ entitlement, isLoading: false });
      return entitlement.isPremium;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ isLoading: false, error: message });
      return false;
    }
  },

  canUse: (feature, context) => canUseFeature(feature, get().entitlement, context),
  getLimit: (feature) => getFeatureLimit(feature, get().entitlement),
}));
