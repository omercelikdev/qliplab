import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clipboard,
  Command,
  Rocket,
  ChevronRight,
  ChevronLeft,
  CornerDownLeft,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, type AppSettings } from '@/stores/settingsStore';
import { formatShortcut } from '@/lib/formatShortcut';
import { cn } from '@/lib/utils';

export const WELCOME_STEPS = 3;

/** The settings written when the wizard finishes (completed or skipped). Pure so
 *  the persisted outcome can be unit-tested without rendering. */
export function welcomeFinishPatch(autostart: boolean): Partial<AppSettings> {
  return {
    welcomeSeen: true,
    // The wizard already teaches the hints, so the inline banner is redundant.
    onboardingSeen: true,
    launchOnLogin: autostart,
  };
}

/** Clamp a step index into the valid [0, WELCOME_STEPS - 1] range. */
export function clampStep(step: number): number {
  return Math.max(0, Math.min(WELCOME_STEPS - 1, step));
}

export function WelcomeWizard() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const [step, setStep] = useState(0);
  const [autostart, setAutostart] = useState(true);

  const shortcut = formatShortcut(settings.globalShortcut);
  const isLast = step === WELCOME_STEPS - 1;

  const finish = () => {
    void updateSettings(welcomeFinishPatch(autostart));
  };

  const next = () => {
    if (isLast) finish();
    else setStep((s) => clampStep(s + 1));
  };
  const back = () => setStep((s) => clampStep(s - 1));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col bg-surface rounded-lg overflow-hidden"
    >
      {/* Skip */}
      <div className="flex justify-end p-3 shrink-0">
        <button
          onClick={finish}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded"
        >
          {t('welcome.skip')}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center gap-4 max-w-xs"
          >
            {step === 0 && (
              <>
                <IconBubble icon={Clipboard} />
                <h1 className="text-lg font-semibold">{t('welcome.step1.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('welcome.step1.body')}</p>
              </>
            )}
            {step === 1 && (
              <>
                <IconBubble icon={Command} />
                <h1 className="text-lg font-semibold">{t('welcome.step2.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('welcome.step2.body')}</p>
                {shortcut && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t('welcome.summonLabel')}
                    </span>
                    <kbd className="inline-flex items-center px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-mono font-medium">
                      {shortcut}
                    </kbd>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 mt-2">
                  <MiniHint icon={CornerDownLeft} text={t('welcome.step2.enterHint')} />
                  <MiniHint icon={ArrowUpDown} text={t('welcome.step2.arrowHint')} />
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <IconBubble icon={Rocket} />
                <h1 className="text-lg font-semibold">{t('welcome.step3.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('welcome.step3.body')}</p>
                <button
                  onClick={() => setAutostart((v) => !v)}
                  aria-pressed={autostart}
                  className={cn(
                    'flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border transition-colors cursor-pointer text-sm',
                    autostart
                      ? 'border-accent/60 bg-accent/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-4 h-4 rounded border shrink-0',
                      autostart ? 'bg-accent border-accent text-white' : 'border-border'
                    )}
                  >
                    {autostart && <Check className="w-3 h-3" />}
                  </span>
                  {t('welcome.step3.autostart')}
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <button
          onClick={back}
          className={cn(
            'flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded',
            step === 0 && 'invisible'
          )}
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          {t('welcome.back')}
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: WELCOME_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'rounded-full transition-all',
                i === step ? 'w-4 h-1.5 bg-accent' : 'w-1.5 h-1.5 bg-border'
              )}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="flex items-center gap-1 text-sm font-medium bg-accent text-white px-4 py-1.5 rounded-lg hover:bg-accent/90 transition-colors cursor-pointer"
        >
          {isLast ? t('welcome.getStarted') : t('welcome.next')}
          {!isLast && <ChevronRight className="w-4 h-4 rtl:rotate-180" />}
        </button>
      </div>
    </motion.div>
  );
}

function IconBubble({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 text-accent">
      <Icon className="w-7 h-7" />
    </div>
  );
}

function MiniHint({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
      <span>{text}</span>
    </div>
  );
}
