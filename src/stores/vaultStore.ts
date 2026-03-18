import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import { useSettingsStore } from '@/stores/settingsStore';
import { encrypt, decrypt, decryptStrict, hashPassword, verifyPassword } from '@/lib/encryption';
import type { VaultItem, VaultItemType, VaultItemData } from '@/types/vault';
import type { VaultItemRow, VaultSettingsRow } from '@/types/database';

// SECURITY: Session password with auto-clear timeout
let sessionPassword: string | null = null;
let autoLockTimer: ReturnType<typeof setTimeout> | null = null;

// Brute-force protection: exponential backoff on failed attempts (persisted to DB)
let failedAttempts = 0;
let lockedUntil = 0;
let bruteForceLoaded = false;

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

async function loadBruteForceState() {
  if (bruteForceLoaded) return;
  try {
    const db = getDatabase();
    const rows = await db.select<VaultSettingsRow[]>(
      "SELECT value FROM vault_settings WHERE key = 'failed_attempts'"
    );
    if (rows.length > 0) {
      const data = JSON.parse(rows[0].value);
      failedAttempts = data.count ?? 0;
      lockedUntil = data.lockedUntil ?? 0;
    }
    bruteForceLoaded = true;
  } catch {
    // DB not ready yet, use in-memory defaults
  }
}

async function saveBruteForceState() {
  try {
    const db = getDatabase();
    const value = JSON.stringify({ count: failedAttempts, lockedUntil });
    await db.execute(
      "INSERT OR REPLACE INTO vault_settings (key, value) VALUES ('failed_attempts', ?)",
      [value]
    );
  } catch {
    // Best-effort persist
  }
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
  decryptFailCount: number;

  unlock: (password: string) => Promise<boolean | 'locked_out'>;
  lock: () => void;
  loadItems: (password: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  createItem: (type: VaultItemType, title: string, data: VaultItemData, trigger?: string) => Promise<void>;
  updateItem: (id: string, title: string, data: VaultItemData, trigger?: string) => Promise<void>;
  updateTrigger: (id: string, trigger: string | null) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isLocked: true,
  items: [],
  lockoutRemaining: 0,
  failedCount: 0,
  decryptFailCount: 0,

  unlock: async (password) => {
    // Load persisted brute-force state on first attempt
    await loadBruteForceState();

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
        await saveBruteForceState();
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
        await saveBruteForceState();
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
      }
      await saveBruteForceState();
      if (lockoutMs > 0) {
        set({ lockoutRemaining: lockoutMs, failedCount: failedAttempts });
        return 'locked_out';
      }
      set({ failedCount: failedAttempts });
      return false;
    } catch {
      return false;
    }
  },

  lock: () => {
    clearSessionPassword();
    set({ isLocked: true, items: [], decryptFailCount: 0 });
  },

  loadItems: async (password) => {
    try {
      const db = getDatabase();
      const result = await db.select<VaultItemRow[]>('SELECT * FROM vault_items ORDER BY sort_order');

      const settled = await Promise.allSettled(
        result.map(async (row): Promise<{ item: VaultItem; needsReEncrypt: boolean }> => {
          let plaintext: string;
          let needsReEncrypt = false;

          // Try strict (current iterations only) first
          try {
            plaintext = await decryptStrict(row.encrypted_data, password);
          } catch {
            // Current failed — try with legacy iterations fallback
            plaintext = await decrypt(row.encrypted_data, password);
            needsReEncrypt = true;
          }

          let parsedData: unknown;
          try {
            parsedData = JSON.parse(plaintext);
          } catch {
            throw new Error(`Vault item ${row.id}: corrupted JSON data`);
          }

          return {
            item: {
              id: row.id,
              type: row.type as VaultItemType,
              title: row.title,
              data: parsedData,
              trigger: row.trigger ?? undefined,
              icon: row.icon ?? undefined,
              isPinned: row.is_pinned === 1,
              sortOrder: row.sort_order,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
            },
            needsReEncrypt,
          };
        })
      );
      const items: VaultItem[] = [];
      let failCount = 0;
      const reEncryptIds: string[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled') {
          items.push(r.value.item);
          if (r.value.needsReEncrypt) reEncryptIds.push(r.value.item.id);
        } else {
          failCount++;
        }
      }
      set({ items, decryptFailCount: failCount });

      // Re-encrypt legacy items with current iterations (background, non-blocking)
      if (reEncryptIds.length > 0) {
        for (const id of reEncryptIds) {
          const item = items.find(i => i.id === id);
          if (item) {
            try {
              const newEncrypted = await encrypt(JSON.stringify(item.data), password);
              await db.execute('UPDATE vault_items SET encrypted_data = ? WHERE id = ?', [newEncrypted, id]);
            } catch {
              // Best-effort re-encryption
            }
          }
        }
      }
    } catch {
      // Load failed
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
    } catch {
      // Toggle pin failed
    }
  },

  createItem: async (type, title, data, trigger) => {
    try {
      const password = sessionPassword;
      if (!password) return;
      // Reset auto-lock timer on activity
      resetAutoLockTimer(() => get().lock());

      const db = getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const encryptedData = await encrypt(JSON.stringify(data), password);

      await db.execute(
        `INSERT INTO vault_items (id, type, title, encrypted_data, trigger, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, type, title, encryptedData, trigger || null, 0, now, now]
      );

      // Optimistic local update — avoid re-decrypting all items
      const newItem: VaultItem = {
        id,
        type,
        title,
        data,
        trigger: trigger ?? undefined,
        isPinned: false,
        sortOrder: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
      set((state) => ({ items: [newItem, ...state.items] }));
    } catch {
      // Create failed
    }
  },

  updateItem: async (id, title, data, trigger) => {
    try {
      const password = sessionPassword;
      if (!password) return;
      resetAutoLockTimer(() => get().lock());

      const db = getDatabase();
      const now = new Date().toISOString();
      const encryptedData = await encrypt(JSON.stringify(data), password);

      await db.execute(
        'UPDATE vault_items SET title = ?, encrypted_data = ?, trigger = ?, updated_at = ? WHERE id = ?',
        [title, encryptedData, trigger || null, now, id]
      );

      set((state) => ({
        items: state.items.map((i) =>
          i.id === id ? { ...i, title, data, trigger: trigger ?? undefined, updatedAt: new Date(now) } : i
        ),
      }));
    } catch {
      // Update failed
    }
  },

  updateTrigger: async (id, trigger) => {
    try {
      const db = getDatabase();
      await db.execute('UPDATE vault_items SET trigger = ? WHERE id = ?', [trigger, id]);
      set((state) => ({
        items: state.items.map((i) => i.id === id ? { ...i, trigger: trigger ?? undefined } : i),
      }));
    } catch {
      // Update trigger failed
    }
  },

  deleteItem: async (id) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM vault_items WHERE id = ?', [id]);
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    } catch {
      // Delete failed
    }
  },
}));
