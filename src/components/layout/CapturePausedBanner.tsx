import { useTranslation } from 'react-i18next';
import { Pause, Play } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

/**
 * A slim strip that makes it unmistakable capture is off — otherwise a paused
 * user copies things, sees nothing land in history, and thinks it's broken.
 */
export function CapturePausedBanner() {
  const { t } = useTranslation();
  const isCapturePaused = useAppStore((s) => s.isCapturePaused);
  const setCapturePaused = useAppStore((s) => s.setCapturePaused);

  if (!isCapturePaused) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] bg-amber-500/12 text-amber-600 dark:text-amber-400 border-b border-amber-500/20 shrink-0">
      <Pause className="w-3 h-3 shrink-0" />
      <span className="flex-1 truncate font-medium">{t('capture.paused')}</span>
      <button
        onClick={() => setCapturePaused(false)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-amber-500/15 transition-colors cursor-pointer no-drag"
      >
        <Play className="w-3 h-3" />
        {t('capture.resume')}
      </button>
    </div>
  );
}
