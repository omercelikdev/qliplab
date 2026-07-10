import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, ShieldAlert, ExternalLink, RefreshCw } from 'lucide-react';
import { usePermissionStore } from '@/stores/permissionStore';

/**
 * Without macOS Accessibility, auto-paste and snippet auto-expand silently do
 * nothing — the app looks broken. Say so, and offer the one-click path to fix it.
 */
export function AccessibilityBanner() {
  const { t } = useTranslation();
  const granted = usePermissionStore((s) => s.accessibilityGranted);
  const dismissed = usePermissionStore((s) => s.bannerDismissed);
  const openSettings = usePermissionStore((s) => s.openSettings);
  const check = usePermissionStore((s) => s.check);
  const dismissBanner = usePermissionStore((s) => s.dismissBanner);

  // `null` means we haven't checked yet — don't flash a banner during startup.
  if (granted !== false || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 shrink-0"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <p className="text-xs font-medium">{t('permissions.accessibility.title')}</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {t('permissions.accessibility.description')}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={openSettings}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              {t('permissions.accessibility.openSettings')}
            </button>
            <button
              onClick={() => void check()}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md text-muted-foreground hover:bg-surface-hover transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              {t('permissions.accessibility.recheck')}
            </button>
          </div>
        </div>
        <button
          onClick={dismissBanner}
          aria-label={t('permissions.accessibility.dismiss')}
          className="p-0.5 hover:bg-surface-hover rounded transition-colors cursor-pointer shrink-0 mt-0.5 focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}
