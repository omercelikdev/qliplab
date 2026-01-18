# PHASE 2: Clipboard Listener + Database + Format Detection

> **First read:** `prompts/COMMON.md` for Master Instructions
> **Prerequisites:** PHASE 1 completed

---

## PROMPT

```
Continuing qliplab. This is PHASE 2 - Clipboard listener, SQLite database, format detection.

## READ FIRST
- CLAUDE.md
- docs/PROGRESS.md

## STEP 1: Tauri Plugins

**Cargo.toml (src-tauri/):**
```toml
[dependencies]
tauri-plugin-clipboard-manager = "2"
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-global-shortcut = "2"
tauri-plugin-store = "2"
```

**src-tauri/src/main.rs:**
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**src-tauri/capabilities/default.json:**
```json
{
  "$schema": "https://schema.tauri.app/config/2/capability",
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-close",
    "core:window:allow-hide",
    "core:window:allow-show",
    "clipboard-manager:allow-read-text",
    "clipboard-manager:allow-write-text",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "store:allow-get",
    "store:allow-set"
  ]
}
```

## STEP 2: Database Setup

**src/lib/database.ts:**
```typescript
import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function initDatabase() {
  db = await Database.load('sqlite:qliplab.db');
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clipboard_history (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      content_type TEXT NOT NULL,
      detected_format TEXT,
      source_app TEXT,
      is_pinned INTEGER DEFAULT 0,
      is_sensitive INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_created_at ON clipboard_history(created_at DESC)`);
}

export function getDatabase() {
  if (!db) throw new Error('Database not initialized');
  return db;
}
```

## STEP 3: Format Detection

**src/lib/formatDetector.ts:**
```typescript
import type { DetectedFormat } from '@/types/clipboard';

export function detectFormat(content: string): DetectedFormat {
  const trimmed = content.trim();
  
  // JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { JSON.parse(trimmed); return 'json'; } catch {}
  }
  
  // JWT
  if (/^eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(trimmed)) return 'jwt';
  
  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return 'uuid';
  
  // URL
  if (/^https?:\/\/[^\s]+$/.test(trimmed)) return 'url';
  
  // URL Encoded
  if (/^[a-zA-Z0-9-_.~]+(%[0-9A-Fa-f]{2})+/.test(trimmed)) return 'url_encoded';
  
  // Base64
  if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length > 20) {
    try { atob(trimmed); return 'base64'; } catch {}
  }
  
  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i.test(trimmed)) return 'sql';
  
  // XML/HTML
  if (/^<[a-zA-Z][\s\S]*>[\s\S]*<\/[a-zA-Z]+>$/.test(trimmed)) {
    return /<(!DOCTYPE\s+)?html/i.test(trimmed) ? 'html' : 'xml';
  }
  
  // Unix Timestamp
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = parseInt(trimmed);
    const date = new Date(trimmed.length === 13 ? num : num * 1000);
    if (date.getFullYear() > 1970 && date.getFullYear() < 2100) return 'timestamp';
  }
  
  return 'plain';
}

export function isSensitive(content: string): boolean {
  const patterns = [
    /password\s*[:=]/i,
    /secret\s*[:=]/i,
    /api[_-]?key\s*[:=]/i,
    /token\s*[:=]/i,
    /\b[A-Z]{2,4}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/, // IBAN
    /\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}\b/, // Credit card
  ];
  return patterns.some(pattern => pattern.test(content));
}
```

## STEP 4: Clipboard Listener Hook

**src/hooks/useClipboardListener.ts:**
```typescript
import { useEffect, useRef } from 'react';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { useHistoryStore } from '@/stores/historyStore';
import { detectFormat, isSensitive } from '@/lib/formatDetector';

export function useClipboardListener() {
  const lastContentRef = useRef<string>('');
  const { addItem } = useHistoryStore();
  
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const content = await readText();
        if (content && content !== lastContentRef.current) {
          lastContentRef.current = content;
          await addItem({
            content,
            contentType: 'text',
            detectedFormat: detectFormat(content),
            isSensitive: isSensitive(content),
          });
        }
      } catch (error) {
        console.error('Clipboard read error:', error);
      }
    };
    
    const interval = setInterval(checkClipboard, 500);
    return () => clearInterval(interval);
  }, [addItem]);
}
```

## STEP 5: History Store

**src/stores/historyStore.ts:**
```typescript
import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import type { ClipboardItem, ContentType, DetectedFormat } from '@/types/clipboard';

interface HistoryState {
  items: ClipboardItem[];
  isLoading: boolean;
  loadItems: () => Promise<void>;
  addItem: (item: Omit<ClipboardItem, 'id' | 'isPinned' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  isLoading: true,
  
  loadItems: async () => {
    const db = getDatabase();
    const result = await db.select<any[]>('SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT 100');
    const items: ClipboardItem[] = result.map(row => ({
      id: row.id,
      content: row.content,
      contentType: row.content_type as ContentType,
      detectedFormat: row.detected_format as DetectedFormat,
      sourceApp: row.source_app,
      isPinned: row.is_pinned === 1,
      isSensitive: row.is_sensitive === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
    set({ items, isLoading: false });
  },
  
  addItem: async (item) => {
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
      `INSERT INTO clipboard_history (id, content, content_type, detected_format, is_sensitive, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, item.content, item.contentType, item.detectedFormat, item.isSensitive ? 1 : 0, now, now]
    );
    await get().loadItems();
  },
  
  deleteItem: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM clipboard_history WHERE id = ?', [id]);
    set(state => ({ items: state.items.filter(i => i.id !== id) }));
  },
  
  togglePin: async (id) => {
    const db = getDatabase();
    const item = get().items.find(i => i.id === id);
    if (!item) return;
    const newPinned = !item.isPinned;
    await db.execute('UPDATE clipboard_history SET is_pinned = ? WHERE id = ?', [newPinned ? 1 : 0, id]);
    set(state => ({ items: state.items.map(i => i.id === id ? { ...i, isPinned: newPinned } : i) }));
  },
  
  clearAll: async () => {
    const db = getDatabase();
    await db.execute('DELETE FROM clipboard_history WHERE is_pinned = 0');
    await get().loadItems();
  },
}));
```

## STEP 6: Update App.tsx

```typescript
import { useEffect } from 'react';
import { initDatabase } from './lib/database';
import { useHistoryStore } from './stores/historyStore';
import { useClipboardListener } from './hooks/useClipboardListener';
// ... other imports

function App() {
  const { loadItems } = useHistoryStore();
  
  useEffect(() => {
    const init = async () => {
      await initDatabase();
      await loadItems();
    };
    init();
  }, []);
  
  useClipboardListener();
  
  // ... rest of component
}
```

## STEP 7: Update HistoryList

```typescript
export function HistoryList() {
  const { items, isLoading } = useHistoryStore();
  
  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  if (items.length === 0) return <div className="p-4 text-center text-muted-foreground">No clips yet. Copy something!</div>;
  
  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {items.map((item) => <HistoryItem key={item.id} item={item} />)}
      </div>
    </ScrollArea>
  );
}
```

## OUTPUT CHECK

- ✅ Clipboard listener working
- ✅ SQLite database saving items
- ✅ Format auto-detection working
- ✅ Sensitive data detection working
- ✅ Duplicate detection
- ✅ Pin/unpin functionality
- ✅ Delete functionality

## TEST
1. Copy some JSON → should appear in list
2. Copy a JWT → format icon should change
3. Copy same text twice → should update timestamp, not duplicate
```
