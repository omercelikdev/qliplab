import { create } from 'zustand';
import {
  isAccessibilityGranted,
  openAccessibilitySettings,
  requestAccessibilityPermission,
} from '@/lib/permissions';

interface PermissionState {
  /** null until the first check completes. */
  accessibilityGranted: boolean | null;
  bannerDismissed: boolean;

  /** Re-read the permission from the OS and cache the result. */
  check: () => Promise<boolean>;
  /** Ask the OS to show its permission dialog, then re-check. */
  request: () => Promise<void>;
  openSettings: () => Promise<void>;
  dismissBanner: () => void;
}

export const usePermissionStore = create<PermissionState>((set) => ({
  accessibilityGranted: null,
  bannerDismissed: false,

  check: async () => {
    const granted = await isAccessibilityGranted();
    set((state) => ({
      accessibilityGranted: granted,
      // Re-surface the banner if permission was revoked after a dismissal.
      bannerDismissed: granted ? state.bannerDismissed : false,
    }));
    return granted;
  },

  request: async () => {
    await requestAccessibilityPermission();
    const granted = await isAccessibilityGranted();
    set({ accessibilityGranted: granted });
  },

  openSettings: async () => {
    await openAccessibilitySettings();
  },

  dismissBanner: () => set({ bannerDismissed: true }),
}));
