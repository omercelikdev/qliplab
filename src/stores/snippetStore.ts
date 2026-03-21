import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import { expandWindowForPreview, shrinkWindowFromPreview } from '@/lib/window';
import type { Snippet, SnippetCategory } from '@/types/snippet';
import type { SnippetRow, SnippetCategoryRow } from '@/types/database';
import { useLicenseStore } from '@/stores/licenseStore';

interface SnippetState {
  snippets: Snippet[];
  categories: SnippetCategory[];
  selectedCategoryId: string | null;
  isLoading: boolean;

  // Editor panel state
  editorOpen: boolean;
  editingSnippet: Snippet | null;

  loadSnippets: (searchQuery?: string, syntaxFilter?: string[], favoritesOnly?: boolean) => Promise<void>;
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

  loadSnippets: async (searchQuery = '', syntaxFilter?: string[], favoritesOnly = false) => {
    try {
      const db = getDatabase();
      const args: (string | number)[] = [];
      let sql = 'SELECT * FROM snippets';
      const conditions: string[] = [];
      if (favoritesOnly) {
        conditions.push('is_pinned = 1');
      }
      if (searchQuery) {
        const escaped = searchQuery.replace(/[%_]/g, '\\$&');
        conditions.push("(title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')");
        args.push(`%${escaped}%`, `%${escaped}%`);
      }
      if (syntaxFilter && syntaxFilter.length > 0) {
        conditions.push(`syntax IN (${syntaxFilter.map(() => '?').join(',')})`);
        args.push(...syntaxFilter);
      }
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY is_pinned DESC, sort_order';
      const result = await db.select<SnippetRow[]>(sql, args);
      const snippets: Snippet[] = result.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        trigger: row.trigger ?? undefined,
        categoryId: row.category_id ?? undefined,
        syntax: row.syntax || 'plain',
        isPinned: row.is_pinned === 1,
        sortOrder: row.sort_order,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
      set({ snippets, isLoading: false });
    } catch {
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
    } catch {
      // Category load failed
    }
  },

  createSnippet: async (snippet) => {
    try {
      // Check snippet limit for free tier
      const licenseState = useLicenseStore.getState();
      if (!licenseState.canUse('snippet_unlimited', { snippetCount: get().snippets.length })) {
        return;
      }

      const db = getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.execute(
        `INSERT INTO snippets (id, title, content, trigger, category_id, syntax, is_pinned, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, snippet.title, snippet.content, snippet.trigger || null, snippet.categoryId || null, snippet.syntax, snippet.isPinned ? 1 : 0, 0, now, now]
      );

      // Optimistic local update
      const newSnippet: Snippet = {
        id,
        title: snippet.title,
        content: snippet.content,
        trigger: snippet.trigger,
        categoryId: snippet.categoryId,
        syntax: snippet.syntax,
        isPinned: snippet.isPinned,
        sortOrder: 0,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
      set((state) => ({ snippets: [newSnippet, ...state.snippets] }));
    } catch {
      // Create failed
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
      if (updates.trigger !== undefined) { fields.push('trigger = ?'); values.push(updates.trigger || null); }
      if (updates.syntax !== undefined) { fields.push('syntax = ?'); values.push(updates.syntax); }
      if (updates.isPinned !== undefined) { fields.push('is_pinned = ?'); values.push(updates.isPinned ? 1 : 0); }
      values.push(id);

      await db.execute(`UPDATE snippets SET ${fields.join(', ')} WHERE id = ?`, values);

      // Optimistic local update
      set((state) => ({
        snippets: state.snippets.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date(now) } : s
        ),
      }));
    } catch {
      // Update failed
    }
  },

  deleteSnippet: async (id) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM snippets WHERE id = ?', [id]);
      set(state => ({ snippets: state.snippets.filter(s => s.id !== id) }));
    } catch {
      // Delete failed
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

      // Optimistic local update
      const newCategory: SnippetCategory = { id, name, icon, sortOrder: 0, createdAt: new Date(now) };
      set((state) => ({ categories: [...state.categories, newCategory] }));
    } catch {
      // Category create failed
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
