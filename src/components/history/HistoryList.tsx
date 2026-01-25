import { useRef, useEffect, useCallback, useState } from 'react';
import { Clipboard, Search } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { useHistoryStore } from '@/stores/historyStore';
import { useAppStore } from '@/stores/appStore';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64 } from 'tauri-plugin-clipboard-api';
import { hideWriteAndPaste, hideAndSimulatePaste } from '@/lib/window';
import { getImageBase64ForClipboard } from '@/lib/imageUtils';

export function HistoryList() {
  const { items, isLoading } = useHistoryStore();
  const { searchQuery, activeTab, isDiffMode } = useAppStore();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pastingItemId, setPastingItemId] = useState<string | null>(null);

  // Filter items by search query
  const filteredItems = searchQuery
    ? items.filter((item) =>
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const handleSelect = useCallback(async (index: number) => {
    if (isDiffMode || pastingItemId) return;
    const item = filteredItems[index];
    if (item) {
      if (item.contentType === 'image') {
        // For images: show loading, write to clipboard, then hide and paste
        const base64 = getImageBase64ForClipboard(item.content);
        if (base64) {
          setPastingItemId(item.id);
          try {
            await writeImageBase64(base64);
            await hideAndSimulatePaste();
          } finally {
            setPastingItemId(null);
          }
        }
      } else {
        // For text: fast path - hide immediately
        await hideWriteAndPaste(async () => {
          await writeText(item.content);
        });
      }
    }
  }, [filteredItems, isDiffMode, pastingItemId]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: filteredItems.length,
    onSelect: handleSelect,
    isActive: activeTab === 'history' && !isDiffMode,
  });

  // Scroll selected item into view
  useEffect(() => {
    const itemEl = itemRefs.current.get(selectedIndex);
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [selectedIndex]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-accent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // Empty state - no items at all
  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-[200px]">
          <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
            <Clipboard className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">No clips yet</h3>
            <p className="text-xs text-muted-foreground">
              Copy something to get started. Your clipboard history will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No search results
  if (filteredItems.length === 0 && searchQuery) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-[200px]">
          <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">No results</h3>
            <p className="text-xs text-muted-foreground">
              No items match "{searchQuery}"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={listRef} className="h-full overflow-y-auto overflow-x-hidden">
      <div className="pl-3 pr-1.5 py-1 space-y-0.5">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            ref={(el) => {
              if (el) itemRefs.current.set(index, el);
              else itemRefs.current.delete(index);
            }}
          >
            <HistoryItem item={item} isSelected={index === selectedIndex && !isDiffMode} isPastingFromKeyboard={item.id === pastingItemId} />
          </div>
        ))}
      </div>
    </div>
  );
}
