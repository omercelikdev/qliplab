import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import type { Snippet, SnippetCategory } from '@/types/snippet';

interface SnippetState {
  snippets: Snippet[];
  categories: SnippetCategory[];
  selectedCategoryId: string | null;
  isLoading: boolean;

  loadSnippets: () => Promise<void>;
  loadCategories: () => Promise<void>;
  createSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Promise<void>;
  updateSnippet: (id: string, updates: Partial<Snippet>) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
  createCategory: (name: string, icon?: string) => Promise<void>;
  setSelectedCategory: (id: string | null) => void;
}

export const useSnippetStore = create<SnippetState>((set, get) => ({
  snippets: [],
  categories: [],
  selectedCategoryId: null,
  isLoading: true,

  loadSnippets: async () => {
    const db = getDatabase();
    const result = await db.select<any[]>('SELECT * FROM snippets ORDER BY sort_order');
    const snippets: Snippet[] = result.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      categoryId: row.category_id,
      syntax: row.syntax || 'plain',
      isFavorite: row.is_favorite === 1,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
    set({ snippets, isLoading: false });
  },

  loadCategories: async () => {
    const db = getDatabase();
    const result = await db.select<any[]>('SELECT * FROM snippet_categories ORDER BY sort_order');
    const categories: SnippetCategory[] = result.map(row => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
    }));
    set({ categories });
  },

  createSnippet: async (snippet) => {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO snippets (id, title, content, category_id, syntax, is_favorite, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, snippet.title, snippet.content, snippet.categoryId || null, snippet.syntax, snippet.isFavorite ? 1 : 0, 0, now, now]
    );
    await get().loadSnippets();
  },

  updateSnippet: async (id, updates) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
    if (updates.isFavorite !== undefined) { fields.push('is_favorite = ?'); values.push(updates.isFavorite ? 1 : 0); }
    values.push(id);

    await db.execute(`UPDATE snippets SET ${fields.join(', ')} WHERE id = ?`, values);
    await get().loadSnippets();
  },

  deleteSnippet: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM snippets WHERE id = ?', [id]);
    set(state => ({ snippets: state.snippets.filter(s => s.id !== id) }));
  },

  createCategory: async (name, icon) => {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO snippet_categories (id, name, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, name, icon || null, 0, now]
    );
    await get().loadCategories();
  },

  setSelectedCategory: (id) => set({ selectedCategoryId: id }),
}));
