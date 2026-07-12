import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Clipboard, ArrowUpDown, Keyboard, GitCompare, Command } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatShortcut } from '@/lib/formatShortcut';

const isMac = navigator.platform.toUpperCase().includes('MAC');

export function OnboardingBanner() {
  const { settings, updateSetting } = useSettingsStore();
  const { t } = useTranslation();

  if (settings.onboardingSeen) return null;

  const dismiss = () => updateSetting('onboardingSeen', true);
  const diffKey = isMac ? t('onboarding.hint.optionD') : t('onboarding.hint.altD');
  const summonKey = formatShortcut(settings.globalShortcut);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-accent/30 bg-accent/5 px-3 py-2 shrink-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <p className="text-xs font-medium">{t('onboarding.welcome')}</p>
          {summonKey && (
            <div className="flex items-center gap-1.5">
              <Command className="w-3 h-3 text-accent shrink-0" />
              <span className="text-[10px] text-muted-foreground">
                {t('onboarding.hint.summon')}
              </span>
              <kbd className="inline-flex items-center px-1.5 py-px bg-surface border border-border/60 rounded text-[9px] font-mono font-medium text-foreground/70">
                {summonKey}
              </kbd>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <Hint icon={Clipboard} text={t('onboarding.hint.copyAnything')} />
            <Hint icon={Keyboard} text={t('onboarding.hint.enterToPaste')} />
            <Hint icon={ArrowUpDown} text={t('onboarding.hint.arrowKeys')} />
            <Hint icon={GitCompare} text={diffKey} />
          </div>
        </div>
        <button
          onClick={dismiss}
          className="p-0.5 hover:bg-surface-hover rounded transition-colors cursor-pointer shrink-0 mt-0.5"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

function Hint({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3 text-accent shrink-0" />
      <span className="text-[10px] text-muted-foreground">{text}</span>
    </div>
  );
}
