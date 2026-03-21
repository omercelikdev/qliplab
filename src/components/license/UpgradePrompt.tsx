import { useTranslation } from 'react-i18next';
import { Sparkles, RotateCcw } from 'lucide-react';
import { useLicenseStore } from '@/stores/licenseStore';
import { PREMIUM_FEATURES } from '@/lib/license';
import type { PremiumFeature } from '@/types/license';
import { cn } from '@/lib/utils';

interface UpgradePromptProps {
  feature: PremiumFeature;
  compact?: boolean;
}

export function UpgradePrompt({ feature, compact }: UpgradePromptProps) {
  const { t } = useTranslation();
  const isPurchasing = useLicenseStore((state) => state.isPurchasing);
  const error = useLicenseStore((state) => state.error);
  const purchasePremium = useLicenseStore((state) => state.purchasePremium);
  const restorePurchases = useLicenseStore((state) => state.restorePurchases);
  const def = PREMIUM_FEATURES[feature];

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 rounded-lg">
        <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="text-xs text-muted-foreground truncate">
          {t(def.descriptionKey)}
        </span>
        <button
          onClick={purchasePremium}
          disabled={isPurchasing}
          className="text-xs font-medium text-accent hover:text-accent/80 shrink-0 cursor-pointer"
        >
          {t('license.upgrade.button')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="p-3 rounded-full bg-accent/10 mb-3">
        <Sparkles className="w-6 h-6 text-accent" />
      </div>
      <h3 className="text-sm font-semibold mb-1">
        {t(def.labelKey)}
      </h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-[240px]">
        {t(def.descriptionKey)}
      </p>
      <button
        onClick={purchasePremium}
        disabled={isPurchasing}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer',
          'bg-accent text-accent-foreground hover:bg-accent/90',
          isPurchasing && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isPurchasing ? t('license.upgrade.purchasing') : t('license.upgrade.button')}
      </button>
      <button
        onClick={restorePurchases}
        disabled={isPurchasing}
        className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" />
        {t('license.restore.button')}
      </button>
      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}
