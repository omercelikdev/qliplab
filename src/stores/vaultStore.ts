import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import { useSettingsStore } from '@/stores/settingsStore';
import { encrypt, decrypt, hashPassword, verifyPassword } from '@/lib/encryption';
import type { VaultItem, VaultItemType, VaultItemData } from '@/types/vault';
import type { VaultItemRow, VaultSettingsRow } from '@/types/database';

// SECURITY: Session password with auto-clear timeout
let sessionPassword: string | null = null;
let autoLockTimer: ReturnType<typeof setTimeout> | null = null;

// Brute-force protection: exponential backoff on failed attempts
let failedAttempts = 0;
let lockedUntil = 0;

function getLockoutDuration(attempts: number): number {
  if (attempts < 3) return 0;
  if (attempts < 5) return 3_000;      // 3s
  if (attempts < 7) return 10_000;     // 10s
  if (attempts < 10) return 30_000;    // 30s
  return 60_000;                        // 60s
}

function getRemainingLockout(): number {
  return Math.max(0, lockedUntil - Date.now());
}

// Reset auto-lock timer on activity (reads autoLockMinutes from settings)
function resetAutoLockTimer(lockFn: () => void) {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
  }
  const minutes = useSettingsStore.getState().settings.autoLockMinutes;
  autoLockTimer = setTimeout(() => {
    lockFn();
  }, minutes * 60 * 1000);
}

// Clear session password securely (as much as JS allows)
function clearSessionPassword() {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
  sessionPassword = null;
}

interface VaultState {
  isLocked: boolean;
  items: VaultItem[];
  lockoutRemaining: number;
  failedCount: number;

  unlock: (password: string) => Promise<boolean | 'locked_out'>;
  lock: () => void;
  loadItems: (password: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  createItem: (type: VaultItemType, title: string, data: VaultItemData) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isLocked: true,
  items: [],
  lockoutRemaining: 0,
  failedCount: 0,

  unlock: async (password) => {
    // Check if currently locked out
    const remaining = getRemainingLockout();
    if (remaining > 0) {
      set({ lockoutRemaining: remaining, failedCount: failedAttempts });
      return 'locked_out';
    }

    try {
      const db = getDatabase();
      const result = await db.select<VaultSettingsRow[]>(
        "SELECT value FROM vault_settings WHERE key = 'master_password_hash'"
      );

      if (result.length === 0) {
        // First time - set password
        const hash = await hashPassword(password);
        await db.execute(
          "INSERT INTO vault_settings (key, value) VALUES ('master_password_hash', ?)",
          [hash]
        );
        failedAttempts = 0;
        sessionPassword = password;
        resetAutoLockTimer(() => get().lock());
        set({ isLocked: false, lockoutRemaining: 0, failedCount: 0 });
        return true;
      }

      const storedHash = result[0].value;
      const isValid = await verifyPassword(password, storedHash);

      if (isValid) {
        // Migrate legacy unsalted hash to salted format
        if (!storedHash.includes(':')) {
          const saltedHash = await hashPassword(password);
          await db.execute(
            "UPDATE vault_settings SET value = ? WHERE key = 'master_password_hash'",
            [saltedHash]
          );
        }

        failedAttempts = 0;
        sessionPassword = password;
        resetAutoLockTimer(() => get().lock());
        await get().loadItems(password);
        set({ isLocked: false, lockoutRemaining: 0, failedCount: 0 });
        return true;
      }

      // Failed attempt — apply brute-force protection
      failedAttempts++;
      const lockoutMs = getLockoutDuration(failedAttempts);
      if (lockoutMs > 0) {
        lockedUntil = Date.now() + lockoutMs;
        set({ lockoutRemaining: lockoutMs, failedCount: failedAttempts });
        return 'locked_out';
      }
      set({ failedCount: failedAttempts });
      return false;
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      return false;
    }
  },

  lock: () => {
    clearSessionPassword();
    set({ isLocked: true, items: [] });
  },

  loadItems: async (password) => {
    try {
      const db = getDatabase();
      const result = await db.select<VaultItemRow[]>('SELECT * FROM vault_items ORDER BY sort_order');

      const items: VaultItem[] = await Promise.all(
        result.map(async (row) => ({
          id: row.id,
          type: row.type as VaultItemType,
          title: row.title,
          data: JSON.parse(await decrypt(row.encrypted_data, password)),
          icon: row.icon ?? undefined,
          isPinned: row.is_pinned === 1,
          sortOrder: row.sort_order,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        }))
      );
      set({ items });
    } catch (error) {
      console.error('Failed to load vault items:', error);
    }
  },

  togglePin: async (id) => {
    try {
      const db = getDatabase();
      const item = get().items.find(i => i.id === id);
      if (!item) return;
      const newPinned = !item.isPinned;
      await db.execute('UPDATE vault_items SET is_pinned = ? WHERE id = ?', [newPinned ? 1 : 0, id]);
      set(state => ({ items: state.items.map(i => i.id === id ? { ...i, isPinned: newPinned } : i) }));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  },

  createItem: async (type, title, data) => {
    try {
      if (!sessionPassword) return;
      // Reset auto-lock timer on activity
      resetAutoLockTimer(() => get().lock());

      const db = getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const encryptedData = await encrypt(JSON.stringify(data), sessionPassword);

      await db.execute(
        `INSERT INTO vault_items (id, type, title, encrypted_data, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, type, title, encryptedData, 0, now, now]
      );
      await get().loadItems(sessionPassword);
    } catch (error) {
      console.error('Failed to create vault item:', error);
    }
  },

  deleteItem: async (id) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM vault_items WHERE id = ?', [id]);
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    } catch (error) {
      console.error('Failed to delete vault item:', error);
    }
  },
}));
