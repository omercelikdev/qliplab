import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { EntitlementState, PremiumFeature } from '@/types/license';
import { CONFIG } from '@/lib/config';
import {
  isBeta,
  canUseFeature,
  getFeatureLimit,
  DEFAULT_ENTITLEMENT,
  BETA_ENTITLEMENT,
  type FeatureContext,
} from '@/lib/license';

interface StoredLicense {
  key: string;
  instanceId: string;
  entitlement: EntitlementState;
}

interface LicenseState {
  entitlement: EntitlementState;
  isLoading: boolean;
  isActivating: boolean;
  error: string | null;

  checkEntitlement: () => Promise<void>;
  activateLicense: (key: string) => Promise<boolean>;
  activateByOrderId: (orderId: string) => Promise<boolean>;
  deactivateLicense: () => Promise<void>;
  openPurchasePage: () => Promise<void>;
  canUse: (feature: PremiumFeature, context?: FeatureContext) => boolean;
  getLimit: (feature: PremiumFeature) => number | null;
}

let store: Store | null = null;
async function getStore(): Promise<Store> {
  if (!store) store = await Store.load('license.json');
  return store;
}

function makeInstanceName(): string {
  const platform = typeof navigator !== 'undefined' && navigator.platform ? navigator.platform : 'desktop';
  return `QlipLab (${platform})`;
}

interface LicenseApiResponse {
  success?: boolean;
  valid?: boolean;
  instanceId?: string | null;
  error?: string | null;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  entitlement: isBeta() ? BETA_ENTITLEMENT : DEFAULT_ENTITLEMENT,
  isLoading: !isBeta(),
  isActivating: false,
  error: null,

  checkEntitlement: async () => {
    // Beta builds (v0.x): full access, no license needed.
    if (isBeta()) {
      set({ entitlement: BETA_ENTITLEMENT, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    let saved: StoredLicense | null = null;
    try {
      const s = await getStore();
      saved = (await s.get<StoredLicense>('license')) ?? null;
    } catch {
      saved = null;
    }

    // No stored key → free tier.
    if (!saved?.key || !saved?.instanceId) {
      set({ entitlement: DEFAULT_ENTITLEMENT, isLoading: false });
      return;
    }

    try {
      const res = await fetch(`${CONFIG.LICENSE_API_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Token': CONFIG.APP_TOKEN },
        body: JSON.stringify({ key: saved.key, instanceId: saved.instanceId }),
      });
      const data = (await res.json()) as LicenseApiResponse;

      if (res.ok && data.success && data.valid) {
        const entitlement: EntitlementState = {
          isPremium: true,
          purchaseDate: saved.entitlement?.purchaseDate ?? null,
          productId: saved.entitlement?.productId ?? null,
          source: 'license_key',
        };
        const s = await getStore();
        await s.set('license', { ...saved, entitlement });
        await s.save();
        set({ entitlement, isLoading: false });
      } else {
        // Key revoked/invalid → drop to free.
        set({ entitlement: DEFAULT_ENTITLEMENT, isLoading: false });
      }
    } catch {
      // Offline: trust the last cached entitlement (grace).
      set({ entitlement: saved.entitlement ?? DEFAULT_ENTITLEMENT, isLoading: false });
    }
  },

  activateLicense: async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      set({ error: 'empty' });
      return false;
    }

    set({ isActivating: true, error: null });
    try {
      const res = await fetch(`${CONFIG.LICENSE_API_URL}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Token': CONFIG.APP_TOKEN },
        body: JSON.stringify({ key: trimmed, instanceName: makeInstanceName() }),
      });
      const data = (await res.json()) as LicenseApiResponse;

      if (res.ok && data.success && data.valid && data.instanceId) {
        const entitlement: EntitlementState = {
          isPremium: true,
          purchaseDate: new Date().toISOString(),
          productId: null,
          source: 'license_key',
        };
        const s = await getStore();
        await s.set('license', {
          key: trimmed,
          instanceId: data.instanceId,
          entitlement,
        } satisfies StoredLicense);
        await s.save();
        set({ entitlement, isActivating: false });
        return true;
      }

      set({ isActivating: false, error: 'failed' });
      return false;
    } catch {
      set({ isActivating: false, error: 'failed' });
      return false;
    }
  },

  activateByOrderId: async (orderId: string) => {
    const id = orderId.trim();
    if (!id) {
      set({ error: 'empty' });
      return false;
    }
    set({ isActivating: true, error: null });
    try {
      const res = await fetch(`${CONFIG.LICENSE_API_URL}/by-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Token': CONFIG.APP_TOKEN },
        body: JSON.stringify({ orderId: id }),
      });
      const data = (await res.json()) as { success?: boolean; key?: string; error?: string };
      if (!res.ok || !data.success || !data.key) {
        set({ isActivating: false, error: 'failed' });
        return false;
      }
      set({ isActivating: false });
      // Re-use the standard activation flow with the fetched key
      return await get().activateLicense(data.key);
    } catch {
      set({ isActivating: false, error: 'failed' });
      return false;
    }
  },

  deactivateLicense: async () => {
    try {
      const s = await getStore();
      const saved = (await s.get<StoredLicense>('license')) ?? null;
      if (saved?.key && saved?.instanceId) {
        await fetch(`${CONFIG.LICENSE_API_URL}/deactivate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-App-Token': CONFIG.APP_TOKEN },
          body: JSON.stringify({ key: saved.key, instanceId: saved.instanceId }),
        }).catch(() => {});
      }
      await s.delete('license');
      await s.save();
    } catch {
      // best-effort
    }
    set({ entitlement: DEFAULT_ENTITLEMENT, error: null });
  },

  openPurchasePage: async () => {
    try {
      await openUrl(CONFIG.PURCHASE_URL);
    } catch {
      // ignore
    }
  },

  canUse: (feature, context) => canUseFeature(feature, get().entitlement, context),
  getLimit: (feature) => getFeatureLimit(feature, get().entitlement),
}));
