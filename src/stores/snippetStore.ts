import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import { expandWindowForPreview, shrinkWindowFromPreview } from '@/lib/window';
import type { Snippet, SnippetCategory } from '@/types/snippet';
import type { SnippetRow, SnippetCategoryRow } from '@/types/database';

interface SnippetState {
  snippets: Snippet[];
  categories: SnippetCategory[];
  selectedCategoryId: string | null;
  isLoading: boolean;

  // Editor panel state
  editorOpen: boolean;
  editingSnippet: Snippet | null;

  loadSnippets: (searchQuery?: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  createSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Promise<void>;
  updateSnippet: (id: string, updates: Partial<Snippet>) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
  createCategory: (name: string, icon?: string) => Promise<void>;
  setSelectedCategory: (id: string | null) => void;
  openEditor: (snippet?: Snippet) => void;
  closeEditor: () => void;
}

export const useSnippetStore = create<SnippetState>((set, get) => ({
  snippets: [],
  categories: [],
  selectedCategoryId: null,
  isLoading: true,
  editorOpen: false,
  editingSnippet: null,

  loadSnippets: async (searchQuery = '') => {
    try {
      const db = getDatabase();
      const args: (string | number)[] = [];
      let sql = 'SELECT * FROM snippets';
      if (searchQuery) {
        sql += ' WHERE (title LIKE ? OR content LIKE ?)';
        args.push(`%${searchQuery}%`, `%${searchQuery}%`);
      }
      sql += ' ORDER BY sort_order';
      const result = await db.select<SnippetRow[]>(sql, args);
      const snippets: Snippet[] = result.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        categoryId: row.category_id ?? undefined,
        syntax: row.syntax || 'plain',
        isFavorite: row.is_favorite === 1,
        sortOrder: row.sort_order,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
      set({ snippets, isLoading: false });
    } catch (error) {
      console.error('Failed to load snippets:', error);
      set({ isLoading: false });
    }
  },

  loadCategories: async () => {
    try {
      const db = getDatabase();
      const result = await db.select<SnippetCategoryRow[]>('SELECT * FROM snippet_categories ORDER BY sort_order');
      const categories: SnippetCategory[] = result.map(row => ({
        id: row.id,
        name: row.name,
        icon: row.icon ?? undefined,
        sortOrder: row.sort_order,
        createdAt: new Date(row.created_at),
      }));
      set({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  },

  createSnippet: async (snippet) => {
    try {
      const db = getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO snippets (id, title, content, category_id, syntax, is_favorite, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, snippet.title, snippet.content, snippet.categoryId || null, snippet.syntax, snippet.isFavorite ? 1 : 0, 0, now, now]
      );
      await get().loadSnippets();
    } catch (error) {
      console.error('Failed to create snippet:', error);
    }
  },

  updateSnippet: async (id, updates) => {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      const fields: string[] = ['updated_at = ?'];
      const values: (string | number | boolean | null)[] = [now];

      if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
      if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
      if (updates.syntax !== undefined) { fields.push('syntax = ?'); values.push(updates.syntax); }
      if (updates.isFavorite !== undefined) { fields.push('is_favorite = ?'); values.push(updates.isFavorite ? 1 : 0); }
      values.push(id);

      await db.execute(`UPDATE snippets SET ${fields.join(', ')} WHERE id = ?`, values);
      await get().loadSnippets();
    } catch (error) {
      console.error('Failed to update snippet:', error);
    }
  },

  deleteSnippet: async (id) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM snippets WHERE id = ?', [id]);
      set(state => ({ snippets: state.snippets.filter(s => s.id !== id) }));
    } catch (error) {
      console.error('Failed to delete snippet:', error);
    }
  },

  createCategory: async (name, icon) => {
    try {
      const db = getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO snippet_categories (id, name, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, name, icon || null, 0, now]
      );
      await get().loadCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  },

  setSelectedCategory: (id) => set({ selectedCategoryId: id }),

  openEditor: (snippet) => {
    const wasOpen = get().editorOpen;
    set({ editorOpen: true, editingSnippet: snippet ?? null });
    if (!wasOpen) expandWindowForPreview();
  },

  closeEditor: () => {
    set({ editorOpen: false, editingSnippet: null });
    shrinkWindowFromPreview();
  },
}));
