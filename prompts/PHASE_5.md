# PHASE 5: Snippets

> **First read:** `prompts/COMMON.md` for Master Instructions
> **Prerequisites:** PHASE 1-4 completed

---

## PROMPT

```
Continuing qliplab. This is PHASE 5 - Snippets feature.

## READ FIRST
- CLAUDE.md
- docs/PROGRESS.md

## STEP 1: Update Database

Add to **src/lib/database.ts** initDatabase():
```typescript
await db.execute(`
  CREATE TABLE IF NOT EXISTS snippets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id TEXT,
    syntax TEXT,
    is_favorite INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS snippet_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  )
`);
```

## STEP 2: Snippet Types

**src/types/snippet.ts:**
```typescript
export interface Snippet {
  id: string;
  title: string;
  content: string;
  categoryId?: string;
  syntax: string;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SnippetCategory {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  createdAt: Date;
}
```

## STEP 3: Snippet Store

**src/stores/snippetStore.ts:**
```typescript
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
      id: row.id, name: row.name, icon: row.icon, sortOrder: row.sort_order, createdAt: new Date(row.created_at),
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
    await db.execute(`INSERT INTO snippet_categories (id, name, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`, [id, name, icon || null, 0, now]);
    await get().loadCategories();
  },
  
  setSelectedCategory: (id) => set({ selectedCategoryId: id }),
}));
```

## STEP 4: Snippet Components

**src/components/snippets/SnippetItem.tsx:**
```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Star, Trash2 } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useSnippetStore } from '@/stores/snippetStore';
import type { Snippet } from '@/types/snippet';
import { cn } from '@/lib/utils';

export function SnippetItem({ snippet }: { snippet: Snippet }) {
  const [isHovered, setIsHovered] = useState(false);
  const { updateSnippet, deleteSnippet } = useSnippetStore();
  
  const handleClick = async () => { await writeText(snippet.content); };
  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateSnippet(snippet.id, { isFavorite: !snippet.isFavorite });
  };
  
  return (
    <motion.div
      className={cn('relative flex items-center gap-3 h-11 px-3 rounded-lg cursor-pointer transition-colors', isHovered ? 'bg-surface-hover' : 'bg-transparent')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
    >
      <Code className="w-4 h-4 text-muted-foreground" />
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{snippet.title}</div>
        <div className="text-xs text-muted-foreground truncate">{snippet.content}</div>
      </div>
      
      {snippet.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
      
      {isHovered && (
        <div className="flex items-center gap-1">
          <button onClick={toggleFavorite} className="p-1 hover:bg-surface rounded">
            <Star className={cn('w-4 h-4', snippet.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground')} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); deleteSnippet(snippet.id); }} className="p-1 hover:bg-surface rounded text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
```

**src/components/snippets/SnippetList.tsx:**
```typescript
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSnippetStore } from '@/stores/snippetStore';
import { SnippetItem } from './SnippetItem';
import { NewSnippetDialog } from './NewSnippetDialog';
import { cn } from '@/lib/utils';

export function SnippetList() {
  const { snippets, isLoading, loadSnippets } = useSnippetStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  useEffect(() => { loadSnippets(); }, []);
  
  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  
  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {snippets.map(snippet => <SnippetItem key={snippet.id} snippet={snippet} />)}
          {snippets.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">No snippets. Create one!</div>}
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t border-border/50">
        <button onClick={() => setIsDialogOpen(true)} className={cn('w-full flex items-center justify-center gap-2 py-2', 'text-sm text-muted-foreground', 'hover:text-foreground hover:bg-surface-hover rounded-md transition-colors')}>
          <Plus className="w-4 h-4" /> New Snippet
        </button>
      </div>
      
      <NewSnippetDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </div>
  );
}
```

**src/components/snippets/NewSnippetDialog.tsx:**
```typescript
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSnippetStore } from '@/stores/snippetStore';
import { cn } from '@/lib/utils';

export function NewSnippetDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { createSnippet } = useSnippetStore();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await createSnippet({ title, content, syntax: 'plain', isFavorite: false });
    setTitle(''); setContent('');
    onClose();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={onClose}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="absolute inset-4 bg-background border border-border rounded-xl shadow-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-12 flex items-center justify-between px-4 border-b border-border">
              <h2 className="font-semibold">New Snippet</h2>
              <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent" />
              <textarea placeholder="Content" value={content} onChange={e => setContent(e.target.value)} rows={6} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent font-mono resize-none" />
              <button type="submit" className={cn('w-full py-2 text-sm font-medium', 'bg-accent text-accent-foreground rounded-lg', 'hover:bg-accent/90 transition-colors')}>Create Snippet</button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

## STEP 5: Update App.tsx

```typescript
import { SnippetList } from './components/snippets/SnippetList';

// In JSX:
{activeTab === 'snippets' && <SnippetList />}
```

## OUTPUT CHECK

- ✅ Snippets tab working
- ✅ Create snippet dialog
- ✅ List snippets
- ✅ Click to copy
- ✅ Toggle favorite
- ✅ Delete snippet
- ✅ Persists in database

## TEST
1. Switch to Snippets tab
2. Click "New Snippet"
3. Fill title and content
4. Create
5. Click snippet → copies to clipboard
6. Star/unstar snippet
7. Delete snippet
```
