import { Lock } from 'lucide-react';
import { useLicenseStore } from '@/stores/licenseStore';
import type { PremiumFeature } from '@/types/license';

interface PremiumBadgeProps {
  feature: PremiumFeature;
  className?: string;
}

export function PremiumBadge({ feature, className }: PremiumBadgeProps) {
  const canUse = useLicenseStore((state) => state.canUse);

  if (canUse(feature)) return null;

  return (
    <Lock className={className ?? 'w-3 h-3 text-muted-foreground/50'} />
  );
}
