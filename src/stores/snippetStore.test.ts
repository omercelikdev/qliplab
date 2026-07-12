import { describe, it, expect, vi, beforeEach } from 'vitest';

const execute = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/database', () => ({
  getDatabase: () => ({ execute, select: vi.fn().mockResolvedValue([]) }),
}));

import { useSnippetStore } from './snippetStore';
import type { Snippet, SnippetCategory } from '@/types/snippet';

const cat = (id: string, name: string): SnippetCategory => ({ id, name, sortOrder: 0, createdAt: new Date(0) });
const snip = (id: string, categoryId?: string): Snippet => ({
  id, title: id, content: '', syntax: 'plain', isPinned: false, sortOrder: 0,
  categoryId, createdAt: new Date(0), updatedAt: new Date(0),
});

describe('snippetStore.deleteCategory', () => {
  beforeEach(() => {
    execute.mockClear();
    useSnippetStore.setState({
      categories: [cat('f1', 'Work'), cat('f2', 'Personal')],
      selectedCategoryId: 'f1',
      snippets: [snip('a', 'f1'), snip('b', 'f2'), snip('c', 'f1')],
    });
  });

  it('removes the folder but keeps its snippets, un-categorized', async () => {
    await useSnippetStore.getState().deleteCategory('f1');
    const s = useSnippetStore.getState();
    expect(s.categories.map((c) => c.id)).toEqual(['f2']);
    // Snippets survive; the ones in f1 lose their category.
    expect(s.snippets.map((x) => [x.id, x.categoryId])).toEqual([
      ['a', undefined], ['b', 'f2'], ['c', undefined],
    ]);
  });

  it('clears the selection when the selected folder is deleted', async () => {
    await useSnippetStore.getState().deleteCategory('f1');
    expect(useSnippetStore.getState().selectedCategoryId).toBeNull();
  });

  it('keeps the selection when a different folder is deleted', async () => {
    await useSnippetStore.getState().deleteCategory('f2');
    expect(useSnippetStore.getState().selectedCategoryId).toBe('f1');
  });

  it('orphans the snippets and drops the row at the DB level', async () => {
    await useSnippetStore.getState().deleteCategory('f1');
    expect(execute).toHaveBeenCalledWith('UPDATE snippets SET category_id = NULL WHERE category_id = ?', ['f1']);
    expect(execute).toHaveBeenCalledWith('DELETE FROM snippet_categories WHERE id = ?', ['f1']);
  });
});
