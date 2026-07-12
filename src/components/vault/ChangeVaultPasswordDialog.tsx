import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { validateNewVaultPassword, MIN_VAULT_PASSWORD_LENGTH } from '@/lib/vaultPassword';
import { cn } from '@/lib/utils';

interface ChangeVaultPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangeVaultPasswordDialog({ isOpen, onClose }: ChangeVaultPasswordDialogProps) {
  const { t } = useTranslation();
  const changePassword = useVaultStore((state) => state.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Reset all fields whenever the dialog is (re)opened, and focus the first.
  useEffect(() => {
    if (!isOpen) return;
    setCurrent('');
    setNext('');
    setConfirm('');
    setShowPassword(false);
    setError('');
    setIsSubmitting(false);
    firstFieldRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const problem = validateNewVaultPassword(next, confirm);
    if (problem === 'tooShort') {
      setError(t('vault.lock.passwordTooShort', { count: MIN_VAULT_PASSWORD_LENGTH }));
      return;
    }
    if (problem === 'mismatch') {
      setError(t('vault.lock.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(current, next);
    setIsSubmitting(false);

    if (result === 'ok') {
      onClose();
      return;
    }
    if (result === 'wrong_password') {
      setError(t('vault.changePassword.wrongCurrent'));
    } else if (result === 'decrypt_error') {
      setError(t('vault.changePassword.decryptError'));
    } else {
      setError(t('vault.changePassword.genericError'));
    }
  };

  const inputClass = cn(
    'w-full px-3 py-2 pe-10 bg-surface border border-border rounded-lg text-sm',
    'outline-none focus:ring-2 focus:ring-accent',
    error && 'border-destructive'
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={t('vault.changePassword.title')}
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[10000] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface border border-border rounded-xl shadow-lg p-4 max-w-[300px] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">{t('vault.changePassword.title')}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t('vault.changePassword.description')}</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  ref={firstFieldRef}
                  type={showPassword ? 'text' : 'password'}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder={t('vault.changePassword.currentPlaceholder')}
                  aria-label={t('vault.changePassword.currentPlaceholder')}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={t('vault.lock.placeholder')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder={t('vault.changePassword.newPlaceholder')}
                aria-label={t('vault.changePassword.newPlaceholder')}
                className={cn(
                  'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm',
                  'outline-none focus:ring-2 focus:ring-accent',
                  error && 'border-destructive'
                )}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('vault.changePassword.confirmPlaceholder')}
                aria-label={t('vault.changePassword.confirmPlaceholder')}
                className={cn(
                  'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm',
                  'outline-none focus:ring-2 focus:ring-accent',
                  error && 'border-destructive'
                )}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs rounded-md bg-surface-hover hover:bg-border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
                    'bg-accent text-accent-foreground hover:bg-accent/90',
                    isSubmitting && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? t('vault.changePassword.saving') : t('vault.changePassword.submit')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
