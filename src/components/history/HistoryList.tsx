import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clipboard, Search, Tag, X } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { useHistoryStore } from '@/stores/historyStore';
import { getSourceApps } from '@/lib/database';
import { QUICK_PASTE_MAX } from '@/lib/quickPaste';
import { useAppStore, FORMAT_FILTER_GROUPS } from '@/stores/appStore';
import type { FormatFilterGroup } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64, writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { hideWriteAndPaste, hideAndSimulatePaste } from '@/lib/window';
import { getImageBase64ForClipboard } from '@/lib/imageUtils';
import { useTagStore } from '@/stores/tagStore';
import { barEndInset } from '@/lib/platform';
import { cn } from '@/lib/utils';
import type { ClipboardItem } from '@/types/clipboard';

export function HistoryList() {
  const { t } = useTranslation();

  // Data selectors — trigger re-render on data change
  const items = useHistoryStore((state) => state.items);
  const totalCount = useHistoryStore((state) => state.totalCount);
  const isLoading = useHistoryStore((state) => state.isLoading);
  const isLoadingMore = useHistoryStore((state) => state.isLoadingMore);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const activeTab = useAppStore((state) => state.activeTab);
  const isDiffMode = useAppStore((state) => state.isDiffMode);
  const formatFilter = useAppStore((state) => state.formatFilter);
  const sourceAppFilter = useAppStore((state) => state.sourceAppFilter);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const isQueueMode = useAppStore((state) => state.isQueueMode);
  const pasteQueue = useAppStore((state) => state.pasteQueue);
  const openMenuItemId = useAppStore((state) => state.openMenuItemId);
  const tags = useTagStore((state) => state.tags);
  const activeTagFilter = useTagStore((state) => state.activeTagFilter);
  const itemTags = useTagStore((state) => state.itemTags);

  // Stable action references — never trigger re-render
  const { loadItems, loadMore } = useHistoryStore.getState();
  const { setFormatFilter, setSourceAppFilter, toggleQueueItem, addToDiffSelection, setOpenMenuItemId } = useAppStore.getState();
  const { openView } = usePreviewStore.getState();
  const { setActiveTagFilter, deleteTag } = useTagStore.getState();

  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pastingItemId, setPastingItemId] = useState<string | null>(null);
  const [sourceApps, setSourceApps] = useState<string[]>([]);

  // Reload from SQL when filter/search changes
  useEffect(() => {
    loadItems(formatFilter, searchQuery, sourceAppFilter);
  }, [formatFilter, searchQuery, sourceAppFilter, loadItems]);

  // The set of apps grows as the user copies from new places; refresh it when
  // the window reopens rather than on every keystroke.
  useEffect(() => {
    let cancelled = false;
    getSourceApps()
      .then((apps) => { if (!cancelled) setSourceApps(apps); })
      .catch(() => { /* filter simply stays hidden */ });
    return () => { cancelled = true; };
  }, [totalCount]);

  // A filtered-out app can disappear (its last clip deleted); don't strand the filter.
  useEffect(() => {
    if (sourceAppFilter && sourceApps.length > 0 && !sourceApps.includes(sourceAppFilter)) {
      setSourceAppFilter(null);
    }
  }, [sourceApps, sourceAppFilter, setSourceAppFilter]);

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

  const handleQueueToggle = useCallback((item: ClipboardItem) => {
    toggleQueueItem(item);
  }, [toggleQueueItem]);

  const handleQuickView = useCallback((item: ClipboardItem) => {
    openView(item);
  }, [openView]);

  // Reorder: pinned first, then unpinned — with optional tag filter
  const { orderedItems, pinnedCount } = useMemo(() => {
    let filtered = items;
    if (activeTagFilter) {
      const taggedItemIds = new Set<string>();
      for (const [itemId, tagIds] of itemTags) {
        if (tagIds.includes(activeTagFilter)) taggedItemIds.add(itemId);
      }
      filtered = items.filter(item => taggedItemIds.has(item.id));
    }
    const pinned = filtered.filter((item) => item.isPinned);
    const unpinned = filtered.filter((item) => !item.isPinned);
    return {
      orderedItems: [...pinned, ...unpinned],
      pinnedCount: pinned.length,
    };
  }, [items, activeTagFilter, itemTags]);

  const remainingCount = totalCount - items.length;

  const handleSelect = useCallback(async (index: number) => {
    if (isDiffMode || isQueueMode || pastingItemId) return;
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
  }, [orderedItems, isDiffMode, isQueueMode, pastingItemId]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: orderedItems.length,
    onSelect: handleSelect,
    isActive: activeTab === 'history' && !isDiffMode,
  });

  // Reset scroll to top when window reopens (matches selectedIndex reset to 0)
  const windowOpenCount = useAppStore((state) => state.windowOpenCount);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [windowOpenCount]);

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
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // "No clips yet" only when nothing is filtered — otherwise it reads as data loss.
  if (totalCount === 0 && !searchQuery && formatFilter === 'all' && !sourceAppFilter) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-[200px]">
          <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
            <Clipboard className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">{t('history.emptyState.title')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('history.emptyState.description')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filterGroups = Object.entries(FORMAT_FILTER_GROUPS) as [FormatFilterGroup, typeof FORMAT_FILTER_GROUPS[FormatFilterGroup]][];

  return (
    <div className="h-full flex flex-col">
      {/* Format filter bar — draggable except buttons. The end inset matches the
          search bar above, so the app filter lines up with the search field. */}
      <div
        data-tauri-drag-region
        style={{ paddingInlineEnd: barEndInset() }}
        className="flex items-center gap-1 ps-3 py-1.5 shrink-0 overflow-x-auto elevation-bottom cursor-move drag-region"
      >
        {filterGroups.map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setFormatFilter(key)}
            className={cn(
              'px-2 py-0.5 text-[10px] rounded-md whitespace-nowrap transition-colors cursor-pointer no-drag focus-visible:ring-2 focus-visible:ring-accent',
              formatFilter === key
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-surface-hover'
            )}
          >
            {label}
          </button>
        ))}

        {/* Source app filter — the column and its index already existed, nothing surfaced them */}
        {sourceApps.length > 0 && (
          <select
            value={sourceAppFilter ?? ''}
            onChange={(e) => setSourceAppFilter(e.target.value || null)}
            aria-label={t('history.filterByApp')}
            title={t('history.filterByApp')}
            className={cn(
              'ms-auto shrink-0 max-w-[120px] ps-1.5 pe-0.5 py-0.5 text-[11px] rounded-md bg-transparent',
              'cursor-pointer no-drag outline-none focus-visible:ring-2 focus-visible:ring-accent',
              sourceAppFilter ? 'text-accent font-medium' : 'text-muted-foreground'
            )}
          >
            <option value="">{t('history.allApps')}</option>
            {sourceApps.map((app) => (
              <option key={app} value={app}>{app}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tag filter — only shown when tags exist */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 shrink-0 overflow-x-auto">
          <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
          {tags.map(tag => (
            <div key={tag.id} className="group/tag relative flex items-center">
              <button
                onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? null : tag.id)}
                className={cn(
                  'flex items-center gap-1 ps-2 pe-1.5 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors cursor-pointer border',
                  activeTagFilter === tag.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-transparent text-muted-foreground hover:bg-surface-hover'
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color || '#888' }}
                />
                {tag.name}
                <span
                  role="button"
                  className="ms-0.5 p-0.5 rounded-full opacity-0 group-hover/tag:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
                  title={t('history.deleteTag')}
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </button>
            </div>
          ))}
          {activeTagFilter && (
            <button
              onClick={() => setActiveTagFilter(null)}
              className="p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              title={t('history.clearTagFilter')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div
        ref={listRef}
        role="listbox"
        tabIndex={0}
        aria-label={t('history.ariaLabel')}
        aria-activedescendant={
          !isDiffMode && !isQueueMode && items[selectedIndex]
            ? `clip-${items[selectedIndex].id}`
            : undefined
        }
        className="flex-1 overflow-y-auto overflow-x-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      >
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-[200px]">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">{t('common.noResults')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('history.noResults.description')}
              </p>
            </div>
          </div>
        </div>
      ) : (
      <div className="ps-3 pe-1.5 py-1 space-y-0.5">
        {orderedItems.map((item, index) => (
          <div key={item.id}>
            {index === 0 && pinnedCount > 0 && (
              <div className="flex items-center gap-2 px-1 pt-1 pb-1.5">
                <span className="text-[9px] uppercase tracking-[0.05em] font-semibold text-foreground/45 shrink-0">{t('common.pinned')}</span>
                <div className="flex-1 dotted-separator" />
              </div>
            )}
            {index === pinnedCount && pinnedCount > 0 && (
              <div className="flex items-center gap-2 px-1 pt-1.5 pb-1.5">
                <span className="text-[9px] uppercase tracking-[0.05em] font-semibold text-foreground/45 shrink-0">{t('common.recent')}</span>
                <div className="flex-1 dotted-separator" />
              </div>
            )}
            <div
              ref={(el) => {
                if (el) itemRefs.current.set(index, el);
                else itemRefs.current.delete(index);
              }}
            >
              <HistoryItem
                item={item}
                isSelected={index === selectedIndex && !isDiffMode && !isQueueMode}
                isPastingFromKeyboard={item.id === pastingItemId}
                isDiffMode={isDiffMode}
                isSelectedForDiff={diffSelectedIds.includes(item.id)}
                isQueueMode={isQueueMode}
                queuePosition={isQueueMode ? (() => { const idx = pasteQueue.findIndex(q => q.id === item.id); return idx >= 0 ? idx + 1 : null; })() : null}
                isMenuOpen={openMenuItemId === item.id}
                quickPasteNumber={!isDiffMode && !isQueueMode && index < QUICK_PASTE_MAX ? index + 1 : null}
                searchQuery={searchQuery}
                onOpenMenu={handleOpenMenu}
                onCloseMenu={handleCloseMenu}
                onDiffSelect={handleDiffSelect}
                onQueueToggle={handleQueueToggle}
                onQuickView={handleQuickView}
              />
            </div>
          </div>
        ))}
        {remainingCount > 0 && (
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="w-full py-2 text-center text-[10px] text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            {isLoadingMore ? t('history.loadingMore') : t('history.loadMore', { count: remainingCount })}
          </button>
        )}
      </div>
      )}
      </div>
    </div>
  );
}
