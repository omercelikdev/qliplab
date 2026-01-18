# PHASE 4: Diff Feature

> **First read:** `prompts/COMMON.md` for Master Instructions
> **Prerequisites:** PHASE 1-3 completed

---

## PROMPT

```
Continuing qliplab. This is PHASE 4 - Diff (comparison) feature.

## READ FIRST
- CLAUDE.md
- docs/PROGRESS.md

## STEP 1: Diff Algorithm

**src/lib/diff.ts:**
```typescript
export interface DiffResult {
  type: 'equal' | 'insert' | 'delete' | 'replace';
  left: string;
  right: string;
  leftLine?: number;
  rightLine?: number;
}

export function computeDiff(left: string, right: string): DiffResult[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const results: DiffResult[] = [];
  
  let i = 0, j = 0;
  
  while (i < leftLines.length || j < rightLines.length) {
    if (i >= leftLines.length) {
      results.push({ type: 'insert', left: '', right: rightLines[j], rightLine: j + 1 });
      j++;
    } else if (j >= rightLines.length) {
      results.push({ type: 'delete', left: leftLines[i], right: '', leftLine: i + 1 });
      i++;
    } else if (leftLines[i] === rightLines[j]) {
      results.push({ type: 'equal', left: leftLines[i], right: rightLines[j], leftLine: i + 1, rightLine: j + 1 });
      i++; j++;
    } else {
      results.push({ type: 'replace', left: leftLines[i], right: rightLines[j], leftLine: i + 1, rightLine: j + 1 });
      i++; j++;
    }
  }
  
  return results;
}
```

## STEP 2: Update appStore

Add to **src/stores/appStore.ts:**
```typescript
interface AppState {
  // ... existing
  isTransformMode: boolean;
  isDiffMode: boolean;
  diffSelectedIds: string[];
  
  setTransformMode: (active: boolean) => void;
  setDiffMode: (active: boolean) => void;
  addToDiffSelection: (id: string) => void;
  clearDiffSelection: () => void;
}

// In create():
isTransformMode: false,
isDiffMode: false,
diffSelectedIds: [],

setTransformMode: (active) => set({ isTransformMode: active }),
setDiffMode: (active) => set({ isDiffMode: active }),
addToDiffSelection: (id) => set((state) => ({
  diffSelectedIds: [...state.diffSelectedIds, id].slice(-2)
})),
clearDiffSelection: () => set({ diffSelectedIds: [] }),
```

## STEP 3: Diff View Component

**src/components/preview/DiffView.tsx:**
```typescript
import { usePreviewStore } from '@/stores/previewStore';
import { computeDiff, DiffResult } from '@/lib/diff';
import { cn } from '@/lib/utils';

export function DiffView() {
  const { diffItems } = usePreviewStore();
  const [left, right] = diffItems;
  
  if (!left || !right) return null;
  
  const diffResults = computeDiff(left.content, right.content);
  
  return (
    <div className="space-y-0">
      {diffResults.map((result, index) => (
        <DiffLine key={index} result={result} />
      ))}
    </div>
  );
}

function DiffLine({ result }: { result: DiffResult }) {
  return (
    <div className={cn(
      'flex text-xs font-mono',
      result.type === 'equal' && 'bg-transparent',
      result.type === 'insert' && 'bg-green-500/10',
      result.type === 'delete' && 'bg-red-500/10',
      result.type === 'replace' && 'bg-yellow-500/10',
    )}>
      {/* Left side */}
      <div className={cn('flex-1 px-2 py-0.5 border-r border-border', result.type === 'insert' && 'opacity-30')}>
        <span className="text-muted-foreground mr-2 select-none">{result.leftLine || ' '}</span>
        <span className={cn(
          result.type === 'delete' && 'text-red-500',
          result.type === 'replace' && 'text-yellow-600',
        )}>{result.left}</span>
      </div>
      
      {/* Right side */}
      <div className={cn('flex-1 px-2 py-0.5', result.type === 'delete' && 'opacity-30')}>
        <span className="text-muted-foreground mr-2 select-none">{result.rightLine || ' '}</span>
        <span className={cn(
          result.type === 'insert' && 'text-green-500',
          result.type === 'replace' && 'text-yellow-600',
        )}>{result.right}</span>
      </div>
    </div>
  );
}
```

## STEP 4: Diff Mode Hook

**src/hooks/useDiffMode.ts:**
```typescript
import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useHistoryStore } from '@/stores/historyStore';

export function useDiffMode() {
  const { isDiffMode, setDiffMode, diffSelectedIds, clearDiffSelection } = useAppStore();
  const { openDiff } = usePreviewStore();
  const { items } = useHistoryStore();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setDiffMode(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'Meta' || e.key === 'Control') {
        setDiffMode(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setDiffMode]);
  
  // Open diff when 2 items selected
  useEffect(() => {
    if (diffSelectedIds.length === 2) {
      const item1 = items.find(i => i.id === diffSelectedIds[0]);
      const item2 = items.find(i => i.id === diffSelectedIds[1]);
      if (item1 && item2) {
        openDiff([item1, item2]);
        clearDiffSelection();
      }
    }
  }, [diffSelectedIds, items, openDiff, clearDiffSelection]);
  
  return { isDiffMode };
}
```

## STEP 5: Update HistoryItem

Add diff selection to **HistoryItem.tsx:**
```typescript
import { useAppStore } from '@/stores/appStore';

// Inside component:
const { isDiffMode, addToDiffSelection, diffSelectedIds } = useAppStore();
const isSelectedForDiff = diffSelectedIds.includes(item.id);

const handleClick = () => {
  if (isDiffMode) {
    addToDiffSelection(item.id);
  } else {
    // Normal paste - writeText and close
    writeText(item.content);
  }
};

// Update className:
className={cn(
  'relative flex items-center gap-3 h-11 px-3 rounded-lg cursor-pointer transition-colors',
  isHovered ? 'bg-surface-hover' : 'bg-transparent',
  isDiffMode && 'cursor-crosshair',
  isSelectedForDiff && 'ring-2 ring-accent',
)}
```

## STEP 6: Update App.tsx

```typescript
import { useDiffMode } from './hooks/useDiffMode';

function App() {
  // ... existing
  useDiffMode();
  
  // ... rest
}
```

## OUTPUT CHECK

- ✅ Cmd+D (held) activates diff mode
- ✅ Cursor changes to crosshair
- ✅ Click first item → ring highlight
- ✅ Click second item → diff opens
- ✅ Side-by-side view
- ✅ Color coding (green=insert, red=delete, yellow=replace)
- ✅ Line numbers

## TEST
1. Copy two different texts
2. Open popup
3. Hold Cmd+D (or Ctrl+D)
4. Click first item
5. Click second item
6. Preview panel shows diff
```
