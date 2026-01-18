import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { cn } from '@/lib/utils';

export function VaultLock() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const unlock = useVaultStore((state) => state.unlock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await unlock(password);
    if (!success) setError('Incorrect password');
    setPassword('');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="p-4 bg-surface rounded-full mb-4">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-2">Vault Locked</h2>
      <p className="text-sm text-muted-foreground mb-6">Enter master password to unlock</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master password"
            className={cn(
              'w-full px-3 py-2 pr-10 bg-surface border border-border rounded-lg text-sm',
              'outline-none focus:ring-2 focus:ring-accent',
              error && 'border-destructive'
            )}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
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
          className={cn(
            'w-full py-2 text-sm font-medium cursor-pointer',
            'bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors'
          )}
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
