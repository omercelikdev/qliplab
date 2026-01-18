# PHASE 3: Transform + Preview Panel

> **First read:** `prompts/COMMON.md` for Master Instructions
> **Prerequisites:** PHASE 1-2 completed

---

## PROMPT

```
Continuing qliplab. This is PHASE 3 - Transform functions and preview panel.

## READ FIRST
- CLAUDE.md
- docs/PROGRESS.md

## STEP 1: Transform Functions

**src/lib/transforms.ts:**
```typescript
// JSON
export function beautifyJson(content: string): string {
  try { return JSON.stringify(JSON.parse(content), null, 2); } catch { return content; }
}

export function minifyJson(content: string): string {
  try { return JSON.stringify(JSON.parse(content)); } catch { return content; }
}

export function validateJson(content: string): { valid: boolean; error?: string } {
  try { JSON.parse(content); return { valid: true }; } catch (e) { return { valid: false, error: (e as Error).message }; }
}

// Base64
export function encodeBase64(content: string): string { return btoa(content); }
export function decodeBase64(content: string): string { try { return atob(content); } catch { return content; } }

// URL
export function encodeUrl(content: string): string { return encodeURIComponent(content); }
export function decodeUrl(content: string): string { try { return decodeURIComponent(content); } catch { return content; } }

// JWT
export function decodeJwt(content: string): { header: any; payload: any } | null {
  const parts = content.split('.');
  if (parts.length !== 3) return null;
  try {
    return { header: JSON.parse(atob(parts[0])), payload: JSON.parse(atob(parts[1])) };
  } catch { return null; }
}

// SQL Format
export function formatSql(content: string): string {
  return content
    .replace(/\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|JOIN|INSERT|INTO|VALUES|UPDATE|SET|DELETE)\b/gi, (match) => '\n' + match.toUpperCase())
    .trim();
}

// Text Case
export function toUpperCase(content: string): string { return content.toUpperCase(); }
export function toLowerCase(content: string): string { return content.toLowerCase(); }
export function toCamelCase(content: string): string {
  return content.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
}
export function toSnakeCase(content: string): string {
  return content.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/\s+/g, '_');
}

// Hash
export async function hashSha256(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Timestamp
export function timestampToDate(content: string): string {
  const ts = parseInt(content);
  return new Date(content.length === 13 ? ts : ts * 1000).toISOString();
}

// HTML
export function escapeHtml(content: string): string {
  return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function unescapeHtml(content: string): string {
  return content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}
```

## STEP 2: Preview Store

**src/stores/previewStore.ts:**
```typescript
import { create } from 'zustand';
import type { ClipboardItem } from '@/types/clipboard';

export type PreviewMode = 'transform' | 'diff';

interface PreviewState {
  isOpen: boolean;
  mode: PreviewMode;
  sourceItem: ClipboardItem | null;
  transformedContent: string;
  transformType: string;
  diffItems: [ClipboardItem | null, ClipboardItem | null];
  
  openTransform: (item: ClipboardItem, type: string, content: string) => void;
  openDiff: (items: [ClipboardItem, ClipboardItem]) => void;
  close: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  isOpen: false,
  mode: 'transform',
  sourceItem: null,
  transformedContent: '',
  transformType: '',
  diffItems: [null, null],
  
  openTransform: (item, type, content) => set({
    isOpen: true, mode: 'transform', sourceItem: item, transformType: type, transformedContent: content,
  }),
  
  openDiff: (items) => set({ isOpen: true, mode: 'diff', diffItems: items }),
  
  close: () => set({ isOpen: false, sourceItem: null, transformedContent: '', diffItems: [null, null] }),
}));
```

## STEP 3: Preview Panel

**src/components/preview/PreviewPanel.tsx:**
```typescript
import { motion } from 'framer-motion';
import { X, Copy, ClipboardPaste } from 'lucide-react';
import { usePreviewStore } from '@/stores/previewStore';
import { TransformView } from './TransformView';
import { DiffView } from './DiffView';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { cn } from '@/lib/utils';

export function PreviewPanel() {
  const { isOpen, mode, transformedContent, transformType, close } = usePreviewStore();
  
  if (!isOpen) return null;
  
  const handleCopy = async () => { await writeText(transformedContent); };
  const handlePaste = async () => { await writeText(transformedContent); close(); };
  
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: '50%', opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="h-full border-l border-border flex flex-col"
    >
      <div className="h-10 flex items-center justify-between px-3 border-b border-border/50">
        <span className="text-sm font-medium">{mode === 'transform' ? transformType : 'Diff'}</span>
        <button onClick={close} className="p-1 hover:bg-surface-hover rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-3">
        {mode === 'transform' ? <TransformView /> : <DiffView />}
      </div>
      
      {mode === 'transform' && (
        <div className="h-10 flex items-center justify-end gap-2 px-3 border-t border-border/50">
          <button onClick={handleCopy} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm', 'bg-surface hover:bg-surface-hover rounded-md')}>
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
          <button onClick={handlePaste} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm', 'bg-accent text-accent-foreground rounded-md hover:bg-accent/90')}>
            <ClipboardPaste className="w-3.5 h-3.5" /> Paste
          </button>
        </div>
      )}
    </motion.div>
  );
}
```

**src/components/preview/TransformView.tsx:**
```typescript
import { usePreviewStore } from '@/stores/previewStore';
import { cn } from '@/lib/utils';

export function TransformView() {
  const { transformedContent, sourceItem } = usePreviewStore();
  const isCode = sourceItem?.detectedFormat && ['json', 'sql', 'xml', 'html'].includes(sourceItem.detectedFormat);
  
  return (
    <pre className={cn('text-sm whitespace-pre-wrap break-all', isCode && 'font-mono')}>
      {transformedContent}
    </pre>
  );
}
```

**src/components/preview/DiffView.tsx:**
```typescript
// Placeholder for now - will be implemented in PHASE 4
export function DiffView() {
  return <div className="text-muted-foreground">Diff view (PHASE 4)</div>;
}
```

## STEP 4: Item Menu with Transforms

**src/components/history/ItemMenu.tsx:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ClipboardPaste, Trash2, Pin, PinOff, Sparkles, Minimize2, Unlock, Lock, ExternalLink } from 'lucide-react';
import { usePreviewStore } from '@/stores/previewStore';
import { useHistoryStore } from '@/stores/historyStore';
import * as transforms from '@/lib/transforms';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { cn } from '@/lib/utils';
import type { ClipboardItem, DetectedFormat } from '@/types/clipboard';

interface ItemMenuProps {
  item: ClipboardItem;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemMenu({ item, isOpen, onClose }: ItemMenuProps) {
  const { openTransform } = usePreviewStore();
  const { deleteItem, togglePin } = useHistoryStore();
  
  const handleCopy = async () => { await writeText(item.content); onClose(); };
  const handleDelete = () => { deleteItem(item.id); onClose(); };
  const handlePin = () => { togglePin(item.id); onClose(); };
  
  const getTransformItems = () => {
    switch (item.detectedFormat) {
      case 'json':
        return [
          { icon: Sparkles, label: 'Beautify', action: () => openTransform(item, 'Beautify JSON', transforms.beautifyJson(item.content)) },
          { icon: Minimize2, label: 'Minify', action: () => openTransform(item, 'Minify JSON', transforms.minifyJson(item.content)) },
        ];
      case 'jwt':
        return [
          { icon: Unlock, label: 'Decode', action: () => {
            const decoded = transforms.decodeJwt(item.content);
            openTransform(item, 'Decode JWT', decoded ? JSON.stringify(decoded, null, 2) : 'Invalid JWT');
          }},
        ];
      case 'base64':
        return [
          { icon: Unlock, label: 'Decode', action: () => openTransform(item, 'Decode Base64', transforms.decodeBase64(item.content)) },
          { icon: Lock, label: 'Encode', action: () => openTransform(item, 'Encode Base64', transforms.encodeBase64(item.content)) },
        ];
      case 'url':
        return [
          { icon: Unlock, label: 'Decode', action: () => openTransform(item, 'Decode URL', transforms.decodeUrl(item.content)) },
        ];
      case 'sql':
        return [
          { icon: Sparkles, label: 'Format', action: () => openTransform(item, 'Format SQL', transforms.formatSql(item.content)) },
        ];
      default:
        return [];
    }
  };
  
  const transformItems = getTransformItems();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn('absolute right-0 top-full z-50 mt-1', 'w-40 py-1 rounded-lg', 'bg-background border border-border shadow-lg')}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuButton icon={Copy} label="Copy" onClick={handleCopy} />
          
          {transformItems.length > 0 && <div className="h-px bg-border my-1" />}
          {transformItems.map((item, i) => (
            <MenuButton key={i} icon={item.icon} label={item.label} onClick={() => { item.action(); onClose(); }} />
          ))}
          
          <div className="h-px bg-border my-1" />
          <MenuButton icon={item.isPinned ? PinOff : Pin} label={item.isPinned ? 'Unpin' : 'Pin'} onClick={handlePin} />
          <MenuButton icon={Trash2} label="Delete" onClick={handleDelete} destructive />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuButton({ icon: Icon, label, onClick, destructive }: { icon: any; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-surface-hover transition-colors', destructive && 'text-destructive')}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
```

## STEP 5: Update HistoryItem

Update HistoryItem to use ItemMenu:
```typescript
import { ItemMenu } from './ItemMenu';

// Inside component:
<ItemMenu item={item} isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
```

## STEP 6: Update App.tsx

```typescript
import { AnimatePresence } from 'framer-motion';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { usePreviewStore } from './stores/previewStore';

// Inside App component:
const { isOpen: previewOpen } = usePreviewStore();

// In JSX:
<div className="flex flex-1 overflow-hidden">
  <div className={cn('flex-1 overflow-hidden transition-all', previewOpen ? 'w-1/2' : 'w-full')}>
    {activeTab === 'history' && <HistoryList />}
    {/* ... other tabs */}
  </div>
  <AnimatePresence>
    {previewOpen && <PreviewPanel />}
  </AnimatePresence>
</div>
```

## OUTPUT CHECK

- ✅ JSON beautify/minify working
- ✅ Base64 encode/decode working
- ✅ URL decode working
- ✅ JWT decode working
- ✅ SQL format working
- ✅ Preview panel opens
- ✅ Copy/Paste buttons working

## TEST
1. Copy JSON → Open menu → Beautify → Preview panel shows beautified JSON
2. Click Copy → Clipboard updated
```
