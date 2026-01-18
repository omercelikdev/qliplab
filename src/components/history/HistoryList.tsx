import { useRef, useEffect, useCallback } from 'react';
import { HistoryItem } from './HistoryItem';
import { useHistoryStore } from '@/stores/historyStore';
import { useAppStore } from '@/stores/appStore';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideAndPaste } from '@/lib/window';

export function HistoryList() {
  const { items, isLoading } = useHistoryStore();
  const { searchQuery, activeTab, isDiffMode } = useAppStore();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Filter items by search query
  const filteredItems = searchQuery
    ? items.filter((item) =>
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const handleSelect = useCallback(async (index: number) => {
    if (isDiffMode) return;
    const item = filteredItems[index];
    if (item) {
      await writeText(item.content);
      await hideAndPaste();
    }
  }, [filteredItems, isDiffMode]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: filteredItems.length,
    onSelect: handleSelect,
    isActive: activeTab === 'history' && !isDiffMode,
  });

  // Scroll selected item into view
  useEffect(() => {
    const itemEl = itemRefs.current.get(selectedIndex);
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  if (items.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No clips yet. Copy something!</div>;
  }

  return (
    <div ref={listRef} className="h-full overflow-y-auto overflow-x-hidden">
      <div className="p-1.5 space-y-0.5">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            ref={(el) => {
              if (el) itemRefs.current.set(index, el);
              else itemRefs.current.delete(index);
            }}
          >
            <HistoryItem item={item} isSelected={index === selectedIndex && !isDiffMode} />
          </div>
        ))}
        {filteredItems.length === 0 && searchQuery && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No results for "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
