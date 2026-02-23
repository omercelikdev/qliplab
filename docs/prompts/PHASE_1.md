# PHASE 1: Project Setup + Basic UI Shell

> **First read:** `prompts/COMMON.md` for Master Instructions

---

## PROMPT

```
I'm developing a cross-platform clipboard manager called qliplab. This is PHASE 1.

## TECH STACK
- Tauri v2 (latest stable)
- React 19, TypeScript 5.6+, Vite 6+
- Tailwind CSS 4 (@tailwindcss/vite)
- shadcn/ui, Framer Motion 12+, Zustand 5+
- Lucide React, clsx + tailwind-merge

## STEP 1: Create Project

```bash
npm create tauri-app@latest qliplab -- --template react-ts
cd qliplab
npm install zustand framer-motion clsx tailwind-merge lucide-react
npm install -D @tailwindcss/vite
npx shadcn@latest init
```
When prompted: TypeScript, Tailwind CSS 4, style: default, base color: neutral

## STEP 2: Create CLAUDE.md (project root)

```markdown
# qliplab - AI Development Context

## Project Summary
Cross-platform clipboard manager. Tauri v2 + React 19 + TypeScript.

## Core Features
1. Clipboard History - Stores everything copied
2. Auto-Detect - Format detection (JSON, JWT, Base64, URL, SQL)
3. Transforms - Beautify, decode, encode
4. Diff - Compare two contents
5. Snippets - Save code snippets
6. Secure Vault - Encrypted storage (AES-256-GCM)

## Tech Stack
- Framework: Tauri v2 (Rust + Web)
- Frontend: React 19 + TypeScript 5.6+
- Build: Vite 6+
- Styling: Tailwind CSS 4 + shadcn/ui
- State: Zustand 5+
- Animations: Framer Motion 12+
- Database: SQLite (Tauri plugin)

## Folder Structure
qliplab/
├── src/components/{ui,layout,history,snippets,vault,preview}
├── src/{hooks,stores,lib,types}
├── src-tauri/
└── docs/

## Commands
- npm run tauri dev
- npm run tauri build
```

## STEP 3: Create docs/ folder

Create these files in `docs/`:

**docs/PROGRESS.md:**
```markdown
# qliplab Progress

## Completed Phases
- [ ] PHASE 1 - Project Setup + UI Shell
- [ ] PHASE 2 - Clipboard + Database
- [ ] PHASE 3 - Transform + Preview
- [ ] PHASE 4 - Diff
- [ ] PHASE 5 - Snippets
- [ ] PHASE 6 - Secure Vault
- [ ] PHASE 7 - Settings
- [ ] PHASE 8 - Build

## Current State
Starting fresh.
```

**docs/DATA_MODELS.md:**
```markdown
# Data Models

## clipboard_history
- id, content, content_type, detected_format
- source_app, is_pinned, is_sensitive
- created_at, updated_at

## snippets
- id, title, content, category_id, syntax
- is_favorite, sort_order, created_at, updated_at

## vault_items
- id, type, title, encrypted_data
- icon, is_favorite, sort_order, created_at, updated_at
```

## STEP 4: Tailwind CSS 4

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  clearScreen: false,
  server: { port: 5173, strictPort: true },
});
```

**src/index.css:**
```css
@import "tailwindcss";

@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(224 71% 4%);
  --color-surface: hsl(220 14% 96%);
  --color-surface-hover: hsl(220 13% 91%);
  --color-border: hsl(220 13% 91%);
  --color-muted-foreground: hsl(220 9% 46%);
  --color-accent: hsl(221 83% 53%);
  --color-destructive: hsl(0 84% 60%);
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

.dark {
  --color-background: hsl(0 0% 4%);
  --color-foreground: hsl(0 0% 98%);
  --color-surface: hsl(0 0% 10%);
  --color-surface-hover: hsl(0 0% 15%);
  --color-border: hsl(0 0% 15%);
  --color-muted-foreground: hsl(0 0% 64%);
}

.glass { @apply bg-background/80 backdrop-blur-xl; }
.drag-region { -webkit-app-region: drag; }
.no-drag { -webkit-app-region: no-drag; }
```

## STEP 5: Tauri Config

**src-tauri/tauri.conf.json:**
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "qliplab",
  "version": "0.1.0",
  "identifier": "com.qliplab.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [{
      "title": "qliplab",
      "width": 420, "height": 450,
      "minWidth": 350, "minHeight": 300,
      "decorations": false,
      "transparent": true,
      "alwaysOnTop": true,
      "skipTaskbar": true,
      "center": true
    }]
  }
}
```

## STEP 6: React Components

Create these files:

**src/stores/appStore.ts:**
```typescript
import { create } from 'zustand';

export type Tab = 'history' | 'snippets' | 'vault';
export type Theme = 'light' | 'dark' | 'system';

interface AppState {
  activeTab: Tab;
  previewOpen: boolean;
  theme: Theme;
  searchQuery: string;
  setActiveTab: (tab: Tab) => void;
  setPreviewOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'history',
  previewOpen: false,
  theme: 'system',
  searchQuery: '',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setTheme: (theme) => set({ theme }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
```

**src/lib/utils.ts:**
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**src/types/clipboard.ts:**
```typescript
export type ContentType = 'text' | 'image' | 'file';
export type DetectedFormat = 'json' | 'jwt' | 'base64' | 'url' | 'url_encoded' | 'sql' | 'xml' | 'html' | 'uuid' | 'timestamp' | 'plain';

export interface ClipboardItem {
  id: string;
  content: string;
  contentType: ContentType;
  detectedFormat: DetectedFormat;
  sourceApp?: string;
  isPinned: boolean;
  isSensitive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**src/components/layout/DragBar.tsx:**
```tsx
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DragBar() {
  return (
    <div className={cn('h-8 flex items-center justify-between px-3', 'drag-region border-b border-border/50')}>
      <div className="flex-1" />
      <button className="no-drag p-1 hover:bg-surface-hover rounded-md transition-colors">
        <Settings className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
```

**src/components/layout/SearchBar.tsx:**
```tsx
import { Search, X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useAppStore();
  return (
    <div className="h-11 px-3 py-2 border-b border-border/50">
      <div className={cn('flex items-center gap-2 h-full px-3', 'bg-surface rounded-lg')}>
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clips..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-surface-hover rounded">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
```

**src/components/layout/TabBar.tsx:**
```tsx
import { useAppStore, Tab } from '@/stores/appStore';
import { cn } from '@/lib/utils';

const tabs: { id: Tab; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'snippets', label: 'Snippets' },
  { id: 'vault', label: 'Vault' },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useAppStore();
  return (
    <div className="h-10 flex items-center gap-1 px-3 border-b border-border/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeTab === tab.id ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

**src/components/layout/HintBar.tsx:**
```tsx
import { cn } from '@/lib/utils';

export function HintBar() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';
  return (
    <div className={cn('h-8 flex items-center justify-center gap-4 px-3', 'border-t border-border/50 text-xs text-muted-foreground')}>
      <span>Click: paste</span>
      <span>{mod}+T: transform</span>
      <span>{mod}+D: diff</span>
    </div>
  );
}
```

**src/components/history/FormatIcon.tsx:**
```tsx
import { Braces, Key, Database, Binary, Link, Code, Type, Hash, Clock, FileCode } from 'lucide-react';
import type { DetectedFormat } from '@/types/clipboard';
import { cn } from '@/lib/utils';

const iconMap: Record<DetectedFormat, { icon: React.ElementType; color: string }> = {
  json: { icon: Braces, color: 'text-yellow-500' },
  jwt: { icon: Key, color: 'text-purple-500' },
  sql: { icon: Database, color: 'text-blue-500' },
  base64: { icon: Binary, color: 'text-green-500' },
  url: { icon: Link, color: 'text-cyan-500' },
  url_encoded: { icon: Code, color: 'text-orange-500' },
  xml: { icon: FileCode, color: 'text-red-500' },
  html: { icon: FileCode, color: 'text-red-500' },
  uuid: { icon: Hash, color: 'text-pink-500' },
  timestamp: { icon: Clock, color: 'text-indigo-500' },
  plain: { icon: Type, color: 'text-muted-foreground' },
};

export function FormatIcon({ format, size = 14 }: { format: DetectedFormat; size?: number }) {
  const { icon: Icon, color } = iconMap[format] || iconMap.plain;
  return <div className={cn('flex-shrink-0', color)}><Icon size={size} /></div>;
}
```

**src/components/history/HistoryItem.tsx:**
```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import { FormatIcon } from './FormatIcon';
import { cn } from '@/lib/utils';
import type { ClipboardItem } from '@/types/clipboard';

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}

export function HistoryItem({ item }: { item: ClipboardItem }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      className={cn('relative flex items-center gap-3 h-11 px-3 rounded-lg cursor-pointer transition-colors', isHovered ? 'bg-surface-hover' : 'bg-transparent')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => console.log('Paste:', item.content)}
      whileTap={{ scale: 0.98 }}
    >
      <FormatIcon format={item.detectedFormat} />
      <span className="flex-1 truncate text-sm">{item.content}</span>
      <span className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</span>
      <AnimatePresence>
        {isHovered && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-1 rounded hover:bg-surface transition-colors">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

**src/components/history/HistoryList.tsx:**
```tsx
import { ScrollArea } from '@/components/ui/scroll-area';
import { HistoryItem } from './HistoryItem';
import type { ClipboardItem } from '@/types/clipboard';

const mockItems: ClipboardItem[] = [
  { id: '1', content: '{"name":"test","age":25}', contentType: 'text', detectedFormat: 'json', isPinned: false, isSensitive: false, createdAt: new Date(Date.now() - 2 * 60000), updatedAt: new Date() },
  { id: '2', content: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0', contentType: 'text', detectedFormat: 'jwt', isPinned: false, isSensitive: false, createdAt: new Date(Date.now() - 5 * 60000), updatedAt: new Date() },
  { id: '3', content: 'SELECT * FROM users WHERE id = 1', contentType: 'text', detectedFormat: 'sql', isPinned: false, isSensitive: false, createdAt: new Date(Date.now() - 8 * 60000), updatedAt: new Date() },
  { id: '4', content: 'https://api.example.com/users?id=123', contentType: 'text', detectedFormat: 'url', isPinned: false, isSensitive: false, createdAt: new Date(Date.now() - 12 * 60000), updatedAt: new Date() },
];

export function HistoryList() {
  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {mockItems.map((item) => <HistoryItem key={item.id} item={item} />)}
      </div>
    </ScrollArea>
  );
}
```

**src/App.tsx:**
```tsx
import { DragBar } from './components/layout/DragBar';
import { SearchBar } from './components/layout/SearchBar';
import { TabBar } from './components/layout/TabBar';
import { HintBar } from './components/layout/HintBar';
import { HistoryList } from './components/history/HistoryList';
import { useAppStore } from './stores/appStore';
import { cn } from './lib/utils';

function App() {
  const { activeTab } = useAppStore();

  return (
    <div className={cn('h-screen w-screen flex flex-col overflow-hidden', 'glass rounded-xl border border-border')}>
      <DragBar />
      <SearchBar />
      <TabBar />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'history' && <HistoryList />}
        {activeTab === 'snippets' && <div className="p-4 text-muted-foreground">Snippets (PHASE 5)</div>}
        {activeTab === 'vault' && <div className="p-4 text-muted-foreground">Vault (PHASE 6)</div>}
      </div>
      <HintBar />
    </div>
  );
}

export default App;
```

## STEP 7: shadcn/ui Components

```bash
npx shadcn@latest add scroll-area
```

## OUTPUT CHECK

- ✅ Tauri + React + TypeScript project
- ✅ CLAUDE.md created
- ✅ docs/ folder with PROGRESS.md
- ✅ Tailwind CSS 4 working
- ✅ Basic layout (DragBar, SearchBar, TabBar, HintBar)
- ✅ History list with mock data
- ✅ Format icons
- ✅ Dark/Light theme support

## TEST
```bash
npm run tauri dev
```
```
