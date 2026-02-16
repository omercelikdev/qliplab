import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Clipboard, Search, Pin } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { useHistoryStore } from '@/stores/historyStore';
import { useAppStore, FORMAT_FILTER_GROUPS, CATEGORIZED_FORMATS } from '@/stores/appStore';
import type { FormatFilterGroup } from '@/stores/appStore';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64, writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { hideWriteAndPaste, hideAndSimulatePaste } from '@/lib/window';
import { getImageBase64ForClipboard } from '@/lib/imageUtils';
import { fuzzyFilter } from '@/lib/fuzzySearch';
import { cn } from '@/lib/utils';

export function HistoryList() {
  const { items, isLoading } = useHistoryStore();
  const { searchQuery, activeTab, isDiffMode, formatFilter, setFormatFilter } = useAppStore();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pastingItemId, setPastingItemId] = useState<string | null>(null);

  // Apply format filter then fuzzy search
  const filteredItems = useMemo(() => {
    let result = items;

    // Format filter
    if (formatFilter === 'other') {
      // Catch-all: items NOT in any specific group (plain, images, uuid, color, etc.)
      result = result.filter((item) => !CATEGORIZED_FORMATS.has(item.detectedFormat));
    } else if (formatFilter !== 'all') {
      const allowedFormats = FORMAT_FILTER_GROUPS[formatFilter].formats;
      if (allowedFormats) {
        result = result.filter((item) => allowedFormats.includes(item.detectedFormat));
      }
    }

    // Fuzzy search
    return fuzzyFilter(result, searchQuery, (item) => item.content);
  }, [items, searchQuery, formatFilter]);

  // Reorder: pinned first, then unpinned — flat list for keyboard nav
  const { orderedItems, pinnedCount } = useMemo(() => {
    const pinned = filteredItems.filter((item) => item.isPinned);
    const unpinned = filteredItems.filter((item) => !item.isPinned);
    return { orderedItems: [...pinned, ...unpinned], pinnedCount: pinned.length };
  }, [filteredItems]);

  const handleSelect = useCallback(async (index: number) => {
    if (isDiffMode || pastingItemId) return;
    const item = orderedItems[index];
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
      } else if (item.htmlContent) {
        // For rich text: write both HTML and plain text
        await hideWriteAndPaste(async () => {
          await writeHtmlAndText(item.htmlContent!, item.content);
        });
      } else {
        // For text: fast path - hide immediately
        await hideWriteAndPaste(async () => {
          await writeText(item.content);
        });
      }
    }
  }, [orderedItems, isDiffMode, pastingItemId]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: orderedItems.length,
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

  const filterGroups = Object.entries(FORMAT_FILTER_GROUPS) as [FormatFilterGroup, typeof FORMAT_FILTER_GROUPS[FormatFilterGroup]][];

  return (
    <div className="h-full flex flex-col">
      {/* Format filter bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 shrink-0 overflow-x-auto elevation-bottom">
        {filterGroups.map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setFormatFilter(key)}
            className={cn(
              'px-2 py-0.5 text-[10px] rounded-md whitespace-nowrap transition-colors cursor-pointer',
              formatFilter === key
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-surface-hover'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="pl-3 pr-1.5 py-1 space-y-0.5">
        {orderedItems.map((item, index) => (
          <div key={item.id}>
            {/* Pinned section header */}
            {index === 0 && pinnedCount > 0 && (
              <div className="flex items-center gap-1.5 px-1 pt-0.5 pb-1">
                <Pin className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Pinned</span>
              </div>
            )}
            {/* Separator between pinned and unpinned */}
            {index === pinnedCount && pinnedCount > 0 && (
              <div className="h-px bg-border/50 my-1" />
            )}
            <div
              ref={(el) => {
                if (el) itemRefs.current.set(index, el);
                else itemRefs.current.delete(index);
              }}
            >
              <HistoryItem item={item} isSelected={index === selectedIndex && !isDiffMode} isPastingFromKeyboard={item.id === pastingItemId} />
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
