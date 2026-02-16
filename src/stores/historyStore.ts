import { create } from 'zustand';
import { getDatabase, queryHistoryItems, countHistoryItems } from '@/lib/database';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ClipboardItem, ContentType, DetectedFormat } from '@/types/clipboard';
import type { ClipboardHistoryRow } from '@/types/database';
import type { FormatFilterGroup } from '@/stores/appStore';

const PAGE_SIZE = 50;

function rowToItem(row: ClipboardHistoryRow): ClipboardItem {
  return {
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
  };
}

interface HistoryState {
  items: ClipboardItem[];
  totalCount: number;
  isLoading: boolean;
  currentOffset: number;
  // Current query params (for load more)
  currentFormatFilter: FormatFilterGroup;
  currentSearchQuery: string;

  loadItems: (formatFilter?: FormatFilterGroup, searchQuery?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  addItem: (item: Omit<ClipboardItem, 'id' | 'isPinned' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  clearUnpinned: () => Promise<void>;
  cleanupExpired: (days: number) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  totalCount: 0,
  isLoading: true,
  currentOffset: 0,
  currentFormatFilter: 'all',
  currentSearchQuery: '',

  loadItems: async (formatFilter = 'all', searchQuery = '') => {
    try {
      const params = { formatFilter, searchQuery, limit: PAGE_SIZE, offset: 0 };
      const [rows, total] = await Promise.all([
        queryHistoryItems(params),
        countHistoryItems({ formatFilter, searchQuery }),
      ]);
      set({
        items: rows.map(rowToItem),
        totalCount: total,
        currentOffset: rows.length,
        currentFormatFilter: formatFilter,
        currentSearchQuery: searchQuery,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { currentOffset, currentFormatFilter, currentSearchQuery, totalCount, items } = get();
    if (currentOffset >= totalCount) return;
    try {
      const rows = await queryHistoryItems({
        formatFilter: currentFormatFilter,
        searchQuery: currentSearchQuery,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });
      const newItems = rows.map(rowToItem);
      set({
        items: [...items, ...newItems],
        currentOffset: currentOffset + newItems.length,
      });
    } catch (error) {
      console.error('Failed to load more items:', error);
    }
  },

  addItem: async (item) => {
    try {
      const db = getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Check duplicates — SQL level
      const existing = await db.select<ClipboardHistoryRow[]>(
        'SELECT id FROM clipboard_history WHERE content = ? LIMIT 1',
        [item.content]
      );
      if (existing.length > 0) {
        await db.execute('UPDATE clipboard_history SET updated_at = ? WHERE id = ?', [now, existing[0].id]);
      } else {
        await db.execute(
          `INSERT INTO clipboard_history (id, content, html_content, content_type, detected_format, source_app, is_sensitive, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, item.content, item.htmlContent ?? null, item.contentType, item.detectedFormat, item.sourceApp ?? null, item.isSensitive ? 1 : 0, now, now]
        );
      }

      // Enforce history limit
      const limit = useSettingsStore.getState().settings.historyLimit;
      await db.execute(
        `DELETE FROM clipboard_history WHERE id IN (
          SELECT id FROM clipboard_history WHERE is_pinned = 0
          ORDER BY created_at DESC LIMIT -1 OFFSET ?
        )`,
        [limit]
      );

      // Reload current view
      const { currentFormatFilter, currentSearchQuery } = get();
      await get().loadItems(currentFormatFilter, currentSearchQuery);
    } catch (error) {
      console.error('Failed to add clipboard item:', error);
    }
  },

  deleteItem: async (id) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM clipboard_history WHERE id = ?', [id]);
      set(state => ({
        items: state.items.filter(i => i.id !== id),
        totalCount: state.totalCount - 1,
      }));
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
      const { currentFormatFilter, currentSearchQuery } = get();
      await get().loadItems(currentFormatFilter, currentSearchQuery);
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
      const { currentFormatFilter, currentSearchQuery } = get();
      await get().loadItems(currentFormatFilter, currentSearchQuery);
    } catch (error) {
      console.error('Failed to cleanup expired items:', error);
    }
  },
}));
