import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ClipboardItem, ContentType, DetectedFormat } from '@/types/clipboard';
import type { ClipboardHistoryRow } from '@/types/database';

interface HistoryState {
  items: ClipboardItem[];
  isLoading: boolean;
  loadItems: () => Promise<void>;
  addItem: (item: Omit<ClipboardItem, 'id' | 'isPinned' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  clearUnpinned: () => Promise<void>;
  cleanupExpired: (days: number) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  isLoading: true,

  loadItems: async () => {
    try {
      const db = getDatabase();
      const limit = useSettingsStore.getState().settings.historyLimit;
      const result = await db.select<ClipboardHistoryRow[]>('SELECT * FROM clipboard_history ORDER BY is_pinned DESC, created_at DESC LIMIT ?', [limit]);
      const items: ClipboardItem[] = result.map(row => ({
        id: row.id,
        content: row.content,
        htmlContent: row.html_content ?? undefined,
        contentType: row.content_type as ContentType,
        detectedFormat: row.detected_format as DetectedFormat,
        sourceApp: row.source_app ?? undefined,
        isPinned: row.is_pinned === 1,
        isSensitive: row.is_sensitive === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
      set({ items, isLoading: false });
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
      set({ isLoading: false });
    }
  },

  addItem: async (item) => {
    try {
      const db = getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Check duplicates
      const existing = get().items.find(i => i.content === item.content);
      if (existing) {
        await db.execute('UPDATE clipboard_history SET updated_at = ? WHERE id = ?', [now, existing.id]);
        await get().loadItems();
        return;
      }

      await db.execute(
        `INSERT INTO clipboard_history (id, content, html_content, content_type, detected_format, source_app, is_sensitive, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.content, item.htmlContent ?? null, item.contentType, item.detectedFormat, item.sourceApp ?? null, item.isSensitive ? 1 : 0, now, now]
      );
      await get().loadItems();
    } catch (error) {
      console.error('Failed to add clipboard item:', error);
    }
  },

  deleteItem: async (id) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM clipboard_history WHERE id = ?', [id]);
      set(state => ({ items: state.items.filter(i => i.id !== id) }));
    } catch (error) {
      console.error('Failed to delete clipboard item:', error);
    }
  },

  togglePin: async (id) => {
    try {
      const db = getDatabase();
      const item = get().items.find(i => i.id === id);
      if (!item) return;
      const newPinned = !item.isPinned;
      await db.execute('UPDATE clipboard_history SET is_pinned = ? WHERE id = ?', [newPinned ? 1 : 0, id]);
      set(state => ({ items: state.items.map(i => i.id === id ? { ...i, isPinned: newPinned } : i) }));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  },

  clearAll: async () => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM clipboard_history WHERE is_pinned = 0');
      await get().loadItems();
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  },

  clearUnpinned: async () => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM clipboard_history WHERE is_pinned = 0');
    } catch (error) {
      console.error('Failed to clear unpinned history:', error);
    }
  },

  cleanupExpired: async (days) => {
    if (days <= 0) return;
    try {
      const db = getDatabase();
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      await db.execute(
        'DELETE FROM clipboard_history WHERE is_pinned = 0 AND created_at < ?',
        [cutoff]
      );
      await get().loadItems();
    } catch (error) {
      console.error('Failed to cleanup expired items:', error);
    }
  },
}));
