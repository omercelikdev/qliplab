import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import type { TagRow, ItemTagRow } from '@/types/database';

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
}

interface TagState {
  tags: Tag[];
  /** Map of item_id → tag_id[] for fast lookups */
  itemTags: Map<string, string[]>;
  activeTagFilter: string | null;

  loadTags: () => Promise<void>;
  loadItemTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<Tag | null>;
  deleteTag: (id: string) => Promise<void>;
  addTagToItem: (itemId: string, tagId: string) => Promise<void>;
  removeTagFromItem: (itemId: string, tagId: string) => Promise<void>;
  getTagsForItem: (itemId: string) => Tag[];
  setActiveTagFilter: (tagId: string | null) => void;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  itemTags: new Map(),
  activeTagFilter: null,

  loadTags: async () => {
    try {
      const db = getDatabase();
      const rows = await db.select<TagRow[]>('SELECT * FROM tags ORDER BY name');
      set({
        tags: rows.map(row => ({
          id: row.id,
          name: row.name,
          color: row.color,
          createdAt: new Date(row.created_at),
        })),
      });
    } catch {
      // Load tags failed
    }
  },

  loadItemTags: async () => {
    try {
      const db = getDatabase();
      const rows = await db.select<ItemTagRow[]>('SELECT * FROM item_tags');
      const map = new Map<string, string[]>();
      for (const row of rows) {
        const existing = map.get(row.item_id) || [];
        existing.push(row.tag_id);
        map.set(row.item_id, existing);
      }
      set({ itemTags: map });
    } catch {
      // Load item tags failed
    }
  },

  createTag: async (name, color) => {
    try {
      const db = getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.execute(
        'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
        [id, name.trim(), color || null, now]
      );
      const tag: Tag = { id, name: name.trim(), color: color || null, createdAt: new Date(now) };
      set(state => ({ tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }));
      return tag;
    } catch {
      return null;
    }
  },

  deleteTag: async (id) => {
    try {
      const db = getDatabase();
      // CASCADE will delete item_tags entries
      await db.execute('DELETE FROM tags WHERE id = ?', [id]);
      set(state => {
        const newItemTags = new Map(state.itemTags);
        for (const [itemId, tagIds] of newItemTags) {
          newItemTags.set(itemId, tagIds.filter(t => t !== id));
        }
        return {
          tags: state.tags.filter(t => t.id !== id),
          itemTags: newItemTags,
          activeTagFilter: state.activeTagFilter === id ? null : state.activeTagFilter,
        };
      });
    } catch {
      // Delete tag failed
    }
  },

  addTagToItem: async (itemId, tagId) => {
    try {
      const db = getDatabase();
      await db.execute(
        'INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)',
        [itemId, tagId]
      );
      set(state => {
        const newItemTags = new Map(state.itemTags);
        const existing = newItemTags.get(itemId) || [];
        if (!existing.includes(tagId)) {
          newItemTags.set(itemId, [...existing, tagId]);
        }
        return { itemTags: newItemTags };
      });
    } catch {
      // Add tag failed
    }
  },

  removeTagFromItem: async (itemId, tagId) => {
    try {
      const db = getDatabase();
      await db.execute(
        'DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?',
        [itemId, tagId]
      );
      set(state => {
        const newItemTags = new Map(state.itemTags);
        const existing = newItemTags.get(itemId) || [];
        newItemTags.set(itemId, existing.filter(t => t !== tagId));
        return { itemTags: newItemTags };
      });
    } catch {
      // Remove tag failed
    }
  },

  getTagsForItem: (itemId) => {
    const { tags, itemTags } = get();
    const tagIds = itemTags.get(itemId) || [];
    return tags.filter(t => tagIds.includes(t.id));
  },

  setActiveTagFilter: (tagId) => set({ activeTagFilter: tagId }),
}));
