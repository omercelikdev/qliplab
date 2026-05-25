import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'checking' | 'downloading' | 'uptodate' | 'error';

export function CheckUpdatesButton() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');

  const busy = status === 'checking' || status === 'downloading';

  const handleCheck = async () => {
    setStatus('checking');
    try {
      const update = await check();
      if (!update) {
        setStatus('uptodate');
        return;
      }
      setStatus('downloading');
      await update.downloadAndInstall();
      await relaunch();
    } catch {
      setStatus('error');
    }
  };

  const label =
    status === 'checking' ? t('settings.about.checking') :
    status === 'downloading' ? t('settings.about.downloading') :
    status === 'uptodate' ? t('settings.about.upToDate') :
    status === 'error' ? t('settings.about.updateError') :
    t('settings.about.checkUpdates');

  return (
    <button
      onClick={handleCheck}
      disabled={busy}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border border-foreground/10 transition-colors cursor-pointer hover:bg-foreground/[0.03]',
        busy && 'opacity-50 cursor-not-allowed'
      )}
    >
      <RefreshCw className={cn('w-3 h-3', busy && 'animate-spin')} />
      {label}
    </button>
  );
}
