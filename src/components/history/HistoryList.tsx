import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Clipboard, Search, Pin } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { useHistoryStore } from '@/stores/historyStore';
import { useAppStore, FORMAT_FILTER_GROUPS } from '@/stores/appStore';
import type { FormatFilterGroup } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64, writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { hideWriteAndPaste, hideAndSimulatePaste } from '@/lib/window';
import { getImageBase64ForClipboard } from '@/lib/imageUtils';
import { cn } from '@/lib/utils';
import type { ClipboardItem } from '@/types/clipboard';

export function HistoryList() {
  const items = useHistoryStore((state) => state.items);
  const totalCount = useHistoryStore((state) => state.totalCount);
  const isLoading = useHistoryStore((state) => state.isLoading);
  const loadItems = useHistoryStore((state) => state.loadItems);
  const loadMore = useHistoryStore((state) => state.loadMore);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const activeTab = useAppStore((state) => state.activeTab);
  const isDiffMode = useAppStore((state) => state.isDiffMode);
  const formatFilter = useAppStore((state) => state.formatFilter);
  const setFormatFilter = useAppStore((state) => state.setFormatFilter);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const openMenuItemId = useAppStore((state) => state.openMenuItemId);
  const addToDiffSelection = useAppStore((state) => state.addToDiffSelection);
  const setOpenMenuItemId = useAppStore((state) => state.setOpenMenuItemId);
  const openView = usePreviewStore((state) => state.openView);

  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pastingItemId, setPastingItemId] = useState<string | null>(null);

  // Reload from SQL when filter/search changes
  useEffect(() => {
    loadItems(formatFilter, searchQuery);
  }, [formatFilter, searchQuery, loadItems]);

  // Stable callbacks for HistoryItem (never change reference)
  const handleOpenMenu = useCallback((id: string) => {
    setOpenMenuItemId(id);
  }, [setOpenMenuItemId]);

  const handleCloseMenu = useCallback(() => {
    setOpenMenuItemId(null);
  }, [setOpenMenuItemId]);

  const handleDiffSelect = useCallback((id: string) => {
    addToDiffSelection(id);
  }, [addToDiffSelection]);

  const handleQuickView = useCallback((item: ClipboardItem) => {
    openView(item);
  }, [openView]);

  // Reorder: pinned first, then unpinned
  const { orderedItems, pinnedCount } = useMemo(() => {
    const pinned = items.filter((item) => item.isPinned);
    const unpinned = items.filter((item) => !item.isPinned);
    return {
      orderedItems: [...pinned, ...unpinned],
      pinnedCount: pinned.length,
    };
  }, [items]);

  const remainingCount = totalCount - items.length;

  const handleSelect = useCallback(async (index: number) => {
    if (isDiffMode || pastingItemId) return;
    const item = orderedItems[index];
    if (item) {
      if (item.contentType === 'image') {
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
        await hideWriteAndPaste(async () => {
          await writeHtmlAndText(item.htmlContent!, item.content);
        });
      } else {
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

  if (totalCount === 0 && !searchQuery && formatFilter === 'all') {
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
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-[200px]">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">No results</h3>
              <p className="text-xs text-muted-foreground">
                No items match your filters
              </p>
            </div>
          </div>
        </div>
      ) : (
      <div className="pl-3 pr-1.5 py-1 space-y-0.5">
        {orderedItems.map((item, index) => (
          <div key={item.id}>
            {index === 0 && pinnedCount > 0 && (
              <div className="flex items-center gap-1.5 px-1 pt-0.5 pb-1">
                <Pin className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Pinned</span>
              </div>
            )}
            {index === pinnedCount && pinnedCount > 0 && (
              <div className="h-px bg-border/50 my-1" />
            )}
            <div
              ref={(el) => {
                if (el) itemRefs.current.set(index, el);
                else itemRefs.current.delete(index);
              }}
            >
              <HistoryItem
                item={item}
                isSelected={index === selectedIndex && !isDiffMode}
                isPastingFromKeyboard={item.id === pastingItemId}
                isDiffMode={isDiffMode}
                isSelectedForDiff={diffSelectedIds.includes(item.id)}
                isMenuOpen={openMenuItemId === item.id}
                searchQuery={searchQuery}
                onOpenMenu={handleOpenMenu}
                onCloseMenu={handleCloseMenu}
                onDiffSelect={handleDiffSelect}
                onQuickView={handleQuickView}
              />
            </div>
          </div>
        ))}
        {remainingCount > 0 && (
          <button
            onClick={loadMore}
            className="w-full py-2 text-center text-[10px] text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
          >
            Load more ({remainingCount})
          </button>
        )}
      </div>
      )}
      </div>
    </div>
  );
}
