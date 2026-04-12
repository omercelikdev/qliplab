import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, ShieldAlert, Plus } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { getDatabase } from '@/lib/database';
import { cn } from '@/lib/utils';
import type { VaultSettingsRow } from '@/types/database';

export function VaultLock() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const unlock = useVaultStore((state) => state.unlock);
  const lockoutRemaining = useVaultStore((state) => state.lockoutRemaining);
  const failedCount = useVaultStore((state) => state.failedCount);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if this is the first time (no password set yet)
  useEffect(() => {
    const check = async () => {
      try {
        const db = getDatabase();
        const result = await db.select<VaultSettingsRow[]>(
          "SELECT value FROM vault_settings WHERE key = 'master_password_hash'"
        );
        setIsFirstTime(result.length === 0);
      } catch {
        setIsFirstTime(false);
      }
    };
    check();
  }, []);

  // Start countdown timer when locked out
  useEffect(() => {
    if (lockoutRemaining > 0) {
      setCountdown(Math.ceil(lockoutRemaining / 1000));
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [lockoutRemaining]);

  const isLockedOut = countdown > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await unlock(password);
    if (result === 'locked_out') {
      setError(t('vault.lock.tooManyAttemptsError'));
    } else if (!result) {
      setError(t('vault.lock.incorrectPassword'));
    }
    setPassword('');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className={cn('p-4 rounded-full mb-4', isLockedOut ? 'bg-destructive/10' : isFirstTime ? 'bg-accent/10' : 'bg-surface')}>
        {isLockedOut ? (
          <ShieldAlert className="w-8 h-8 text-destructive" />
        ) : isFirstTime ? (
          <Plus className="w-8 h-8 text-accent" />
        ) : (
          <Lock className="w-8 h-8 text-muted-foreground" />
        )}
      </div>
      <h2 className="text-lg font-semibold mb-2">
        {isLockedOut ? t('vault.lock.tooManyAttempts') : isFirstTime ? t('vault.lock.createTitle') : t('vault.lock.title')}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isLockedOut
          ? t('vault.lock.tryAgainIn', { seconds: countdown })
          : isFirstTime ? t('vault.lock.createDescription') : t('vault.lock.enterPassword')}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('vault.lock.placeholder')}
            className={cn(
              'w-full px-3 py-2 pe-10 bg-surface border border-border rounded-lg text-sm',
              'outline-none focus:ring-2 focus:ring-accent',
              error && 'border-destructive'
            )}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute end-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={isLockedOut}
          className={cn(
            'w-full py-2 text-sm font-medium rounded-lg transition-colors',
            isLockedOut
              ? 'bg-surface text-muted-foreground cursor-not-allowed'
              : 'bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer'
          )}
        >
          {isLockedOut ? t('vault.lock.locked', { seconds: countdown }) : isFirstTime ? t('vault.lock.createButton') : t('vault.lock.unlock')}
        </button>
        {failedCount >= 3 && !isLockedOut && (
          <p className="text-[10px] text-muted-foreground text-center">
            {t('vault.lock.failedAttempts', { count: failedCount })}
          </p>
        )}
      </form>
    </div>
  );
}
