import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import { encrypt, decrypt, hashPassword } from '@/lib/encryption';
import type { VaultItem, VaultItemType } from '@/types/vault';

let sessionPassword: string | null = null;

interface VaultState {
  isLocked: boolean;
  items: VaultItem[];

  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  loadItems: (password: string) => Promise<void>;
  createItem: (type: VaultItemType, title: string, data: any) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isLocked: true,
  items: [],

  unlock: async (password) => {
    const db = getDatabase();
    const result = await db.select<any[]>(
      "SELECT value FROM vault_settings WHERE key = 'master_password_hash'"
    );

    if (result.length === 0) {
      // First time - set password
      const hash = await hashPassword(password);
      await db.execute(
        "INSERT INTO vault_settings (key, value) VALUES ('master_password_hash', ?)",
        [hash]
      );
      sessionPassword = password;
      set({ isLocked: false });
      return true;
    }

    const storedHash = result[0].value;
    const inputHash = await hashPassword(password);

    if (storedHash === inputHash) {
      sessionPassword = password;
      await get().loadItems(password);
      set({ isLocked: false });
      return true;
    }
    return false;
  },

  lock: () => {
    sessionPassword = null;
    set({ isLocked: true, items: [] });
  },

  loadItems: async (password) => {
    const db = getDatabase();
    const result = await db.select<any[]>('SELECT * FROM vault_items ORDER BY sort_order');

    const items: VaultItem[] = await Promise.all(
      result.map(async (row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        data: JSON.parse(await decrypt(row.encrypted_data, password)),
        icon: row.icon,
        isFavorite: row.is_favorite === 1,
        sortOrder: row.sort_order,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }))
    );
    set({ items });
  },

  createItem: async (type, title, data) => {
    if (!sessionPassword) return;
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const encryptedData = await encrypt(JSON.stringify(data), sessionPassword);

    await db.execute(
      `INSERT INTO vault_items (id, type, title, encrypted_data, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, type, title, encryptedData, 0, now, now]
    );
    await get().loadItems(sessionPassword);
  },

  deleteItem: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM vault_items WHERE id = ?', [id]);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },
}));
