import { create } from 'zustand';
import { getDatabase, queryHistoryItems, countHistoryItems } from '@/lib/database';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useAppStore } from '@/stores/appStore';
import type { ClipboardItem, ContentType, DetectedFormat } from '@/types/clipboard';
import type { ClipboardHistoryRow } from '@/types/database';
import type { FormatFilterGroup } from '@/stores/appStore';
import { PAGE_SIZE, refreshWindowLimit, offsetAfterDelete } from '@/lib/pagination';

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
  isLoadingMore: boolean;
  currentOffset: number;
  // Current query params (for load more)
  currentFormatFilter: FormatFilterGroup;
  currentSearchQuery: string;
  currentSourceApp: string | null;

  loadItems: (formatFilter?: FormatFilterGroup, searchQuery?: string, sourceApp?: string | null) => Promise<void>;
  refreshItems: () => Promise<void>;
  loadMore: () => Promise<void>;
  addItem: (item: Omit<ClipboardItem, 'id' | 'isPinned' | 'createdAt' | 'updatedAt'>) => Promise<string | undefined>;
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
  isLoadingMore: false,
  currentOffset: 0,
  currentFormatFilter: 'all',
  currentSearchQuery: '',
  currentSourceApp: null,

  loadItems: async (formatFilter = 'all', searchQuery = '', sourceApp = null) => {
    try {
      const params = { formatFilter, searchQuery, sourceApp, limit: PAGE_SIZE, offset: 0 };
      const [rows, total] = await Promise.all([
        queryHistoryItems(params),
        countHistoryItems({ formatFilter, searchQuery, sourceApp }),
      ]);
      set({
        items: rows.map(rowToItem),
        totalCount: total,
        currentOffset: rows.length,
        currentFormatFilter: formatFilter,
        currentSearchQuery: searchQuery,
        currentSourceApp: sourceApp,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  /**
   * Re-read the current view, keeping however many rows are already on screen.
   * Used after a clipboard capture, which can fire while the user is browsing
   * a list they expanded with "Load more".
   */
  refreshItems: async () => {
    const { currentFormatFilter, currentSearchQuery, currentSourceApp, items } = get();
    try {
      const params = {
        formatFilter: currentFormatFilter,
        searchQuery: currentSearchQuery,
        sourceApp: currentSourceApp,
        limit: refreshWindowLimit(items.length),
        offset: 0,
      };
      const [rows, total] = await Promise.all([
        queryHistoryItems(params),
        countHistoryItems({ formatFilter: currentFormatFilter, searchQuery: currentSearchQuery, sourceApp: currentSourceApp }),
      ]);
      set({
        items: rows.map(rowToItem),
        totalCount: total,
        currentOffset: rows.length,
        isLoading: false,
      });
    } catch {
      // Keep the current view rather than blanking it
    }
  },

  loadMore: async () => {
    const { currentOffset, currentFormatFilter, currentSearchQuery, currentSourceApp, totalCount, items, isLoadingMore } = get();
    if (currentOffset >= totalCount || isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const rows = await queryHistoryItems({
        formatFilter: currentFormatFilter,
        searchQuery: currentSearchQuery,
        sourceApp: currentSourceApp,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });
      const newItems = rows.map(rowToItem);
      set({
        items: [...items, ...newItems],
        currentOffset: currentOffset + newItems.length,
        isLoadingMore: false,
      });
    } catch {
      set({ isLoadingMore: false });
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
      let itemId: string;
      if (existing.length > 0) {
        // Re-copying an existing clip must resurface it: the list orders by
        // created_at, so bump it as well or the clip stays buried.
        itemId = existing[0].id;
        await db.execute(
          'UPDATE clipboard_history SET created_at = ?, updated_at = ? WHERE id = ?',
          [now, now, itemId]
        );
      } else {
        itemId = id;
        await db.execute(
          `INSERT INTO clipboard_history (id, content, html_content, content_type, detected_format, source_app, is_sensitive, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, item.content, item.htmlContent ?? null, item.contentType, item.detectedFormat, item.sourceApp ?? null, item.isSensitive ? 1 : 0, now, now]
        );
      }

      // Enforce history limit from user setting
      const limit = useSettingsStore.getState().settings.historyLimit;
      await db.execute(
        `DELETE FROM clipboard_history WHERE id IN (
          SELECT id FROM clipboard_history WHERE is_pinned = 0
          ORDER BY created_at DESC LIMIT -1 OFFSET ?
        )`,
        [limit]
      );

      // Refresh the current view without collapsing an expanded ("Load more") list.
      await get().refreshItems();
      return itemId;
    } catch {
      return undefined;
    }
  },

  deleteItem: async (id) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM clipboard_history WHERE id = ?', [id]);
      set(state => {
        const wasLoaded = state.items.some(i => i.id === id);
        return {
          items: state.items.filter(i => i.id !== id),
          totalCount: Math.max(0, state.totalCount - 1),
          // Keep the "Load more" offset aligned with the shrunken table,
          // otherwise the next page skips exactly one row.
          currentOffset: offsetAfterDelete(state.currentOffset, wasLoaded),
        };
      });

      // Clean up related UI state
      const preview = usePreviewStore.getState();
      if (preview.isOpen && preview.sourceItem?.id === id) {
        preview.close();
      }
      const appState = useAppStore.getState();
      if (appState.diffSelectedIds.includes(id)) {
        useAppStore.setState({ diffSelectedIds: appState.diffSelectedIds.filter(did => did !== id) });
      }
    } catch {
      // Delete failed
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
    } catch {
      // Toggle pin failed
    }
  },

  clearAll: async () => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM clipboard_history WHERE is_pinned = 0');
      const { currentFormatFilter, currentSearchQuery } = get();
      await get().loadItems(currentFormatFilter, currentSearchQuery);
    } catch {
      // Clear failed
    }
  },

  clearUnpinned: async () => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM clipboard_history WHERE is_pinned = 0');
    } catch {
      // Clear unpinned failed
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
    } catch {
      // Cleanup failed
    }
  },
}));
