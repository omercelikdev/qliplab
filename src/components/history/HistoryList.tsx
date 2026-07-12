import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clipboard, Search, Tag, X, Clock, Flame } from 'lucide-react';
import { HistoryItem } from './HistoryItem';
import { useHistoryStore } from '@/stores/historyStore';
import { getSourceApps } from '@/lib/database';
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
import { SelectMenu } from '@/components/ui/SelectMenu';
import { useModifierHeld } from '@/hooks/useModifierHeld';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CommandResultRow } from './CommandResultRow';
import { CrossTabSearchHints } from '@/components/layout/CrossTabSearchHints';
import { evaluateCommand } from '@/lib/commandBar';
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
  const historySortMode = useAppStore((state) => state.historySortMode);
  const setHistorySortMode = useAppStore((state) => state.setHistorySortMode);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const isQueueMode = useAppStore((state) => state.isQueueMode);
  const pasteQueue = useAppStore((state) => state.pasteQueue);
  const openMenuItemId = useAppStore((state) => state.openMenuItemId);
  const tags = useTagStore((state) => state.tags);
  const activeTagFilter = useTagStore((state) => state.activeTagFilter);

  // Stable action references — never trigger re-render
  const { loadItems, loadMore } = useHistoryStore.getState();
  const { setFormatFilter, setSourceAppFilter, setSearchQuery, toggleQueueItem, addToDiffSelection, setOpenMenuItemId } = useAppStore.getState();
  const { openView } = usePreviewStore.getState();
  const { setActiveTagFilter, deleteTag } = useTagStore.getState();

  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [pastingItemId, setPastingItemId] = useState<string | null>(null);
  const [sourceApps, setSourceApps] = useState<string[]>([]);
  const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string } | null>(null);
  // Reveals the ⌘1…⌘9 quick-paste hints on the rows while the modifier is held.
  const modifierHeld = useModifierHeld();

  // Reload from SQL when any filter/search changes — tag filter included, so it
  // matches across the whole table and the "Load more" count stays correct.
  useEffect(() => {
    loadItems(formatFilter, searchQuery, sourceAppFilter, activeTagFilter, historySortMode);
  }, [formatFilter, searchQuery, sourceAppFilter, activeTagFilter, historySortMode, loadItems]);

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
  // Tag filtering now happens in SQL (see loadItems); here we only split
  // pinned-first for the section header.
  const { orderedItems, pinnedCount } = useMemo(() => {
    const pinned = items.filter((item) => item.isPinned);
    const unpinned = items.filter((item) => !item.isPinned);
    return {
      orderedItems: [...pinned, ...unpinned],
      pinnedCount: pinned.length,
    };
  }, [items]);

  const remainingCount = totalCount - items.length;

  const handleSelect = useCallback(async (index: number, opts?: { plain?: boolean }) => {
    if (isDiffMode || isQueueMode || pastingItemId) return;
    const item = orderedItems[index];
    if (item) {
      useHistoryStore.getState().recordPaste(item.id);
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
      } else if (item.htmlContent && !opts?.plain) {
        // Shift+Enter forces plain text; otherwise keep the rich HTML.
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

  const handleDeleteSelected = useCallback((index: number) => {
    const item = orderedItems[index];
    if (item) useHistoryStore.getState().deleteItem(item.id);
  }, [orderedItems]);

  // Auto-load the next page as the user nears the bottom, so the list feels
  // endless; the "Load more" button stays as a visible affordance/fallback.
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || isLoadingMore || remainingCount <= 0) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) loadMore();
  }, [isLoadingMore, remainingCount, loadMore]);

  // Turn the search box into a mini command bar: a math/base/unit expression
  // gets an inline, pasteable answer instead of being treated as a query.
  const commandResult = useMemo(() => evaluateCommand(searchQuery), [searchQuery]);
  const pasteCommand = useCallback(async () => {
    if (!commandResult) return;
    await hideWriteAndPaste(async () => {
      await writeText(commandResult.value);
    });
  }, [commandResult]);

  // Enter pastes the command answer even when no clip matches (the nav hook
  // bails on an empty list). Capture phase + stopImmediatePropagation so it
  // wins over the list's own Enter handler.
  useEffect(() => {
    if (!commandResult || activeTab !== 'history') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        pasteCommand();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [commandResult, activeTab, pasteCommand]);

  const hasActiveFilter = !!searchQuery || formatFilter !== 'all' || !!sourceAppFilter || !!activeTagFilter;
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFormatFilter('all');
    setSourceAppFilter(null);
    setActiveTagFilter(null);
  }, [setSearchQuery, setFormatFilter, setSourceAppFilter, setActiveTagFilter]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: orderedItems.length,
    onSelect: handleSelect,
    onDelete: handleDeleteSelected,
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
  if (totalCount === 0 && !searchQuery && formatFilter === 'all' && !sourceAppFilter && !activeTagFilter) {
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

        {/* Sort toggle — chronological vs "most used" (frecency). */}
        <button
          onClick={() => setHistorySortMode(historySortMode === 'frequent' ? 'recent' : 'frequent')}
          aria-label={t('history.sort.label')}
          title={historySortMode === 'frequent' ? t('history.sort.frequent') : t('history.sort.recent')}
          className={cn(
            'ms-auto shrink-0 flex items-center gap-1 ps-1.5 pe-2 py-0.5 text-[10px] rounded-md whitespace-nowrap transition-colors cursor-pointer no-drag focus-visible:ring-2 focus-visible:ring-accent',
            historySortMode === 'frequent' ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-surface-hover'
          )}
        >
          {historySortMode === 'frequent' ? <Flame className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
          {historySortMode === 'frequent' ? t('history.sort.frequent') : t('history.sort.recent')}
        </button>

        {/* Source app filter — custom dropdown so the selection is the app's
            accent, not the macOS system blue a native <select> popup paints. */}
        {sourceApps.length > 0 && (
          <SelectMenu
            value={sourceAppFilter ?? ''}
            onChange={(v) => setSourceAppFilter(v || null)}
            ariaLabel={t('history.filterByApp')}
            options={[
              { value: '', label: t('history.allApps') },
              ...sourceApps.map((app) => ({ value: app, label: app })),
            ]}
            triggerClassName={cn(
              'shrink-0 max-w-[120px] flex items-center gap-1 ps-1.5 pe-1 py-0.5 text-[11px] rounded-md bg-transparent',
              'cursor-pointer no-drag outline-none focus-visible:ring-2 focus-visible:ring-accent',
              sourceAppFilter ? 'text-accent font-medium' : 'text-muted-foreground'
            )}
          />
        )}
      </div>

      {/* Tag filter — only shown when tags exist */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 shrink-0 overflow-x-auto">
          <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
          {tags.map(tag => (
            <div
              key={tag.id}
              className={cn(
                'group/tag flex items-center ps-2 pe-1 py-0.5 rounded-full whitespace-nowrap border transition-colors',
                activeTagFilter === tag.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-transparent text-muted-foreground hover:bg-surface-hover'
              )}
            >
              <button
                onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? null : tag.id)}
                className="flex items-center gap-1 text-[10px] cursor-pointer"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color || '#888' }}
                />
                {tag.name}
              </button>
              <button
                type="button"
                aria-label={t('history.deleteTag')}
                title={t('history.deleteTag')}
                className="ms-0.5 p-0.5 rounded-full opacity-0 group-hover/tag:opacity-100 focus-visible:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all cursor-pointer"
                onClick={() => setTagToDelete({ id: tag.id, name: tag.name })}
              >
                <X className="w-2.5 h-2.5" />
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

      <CrossTabSearchHints />

      <div
        ref={listRef}
        onScroll={handleScroll}
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
      {commandResult && <CommandResultRow result={commandResult} onPaste={pasteCommand} />}
      {items.length === 0 ? (
        commandResult ? null : (
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
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-accent hover:bg-accent/10 rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <X className="w-3 h-3" /> {t('common.clearFilters')}
              </button>
            )}
          </div>
        </div>
        )
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
                quickPasteNumber={!isDiffMode && !isQueueMode && index < 9 ? index + 1 : null}
                modifierHeld={modifierHeld}
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

      <ConfirmDialog
        isOpen={tagToDelete !== null}
        title={t('history.tags.deleteTitle')}
        message={t('history.tags.deleteMessage', { name: tagToDelete?.name ?? '' })}
        onConfirm={() => {
          if (tagToDelete) {
            deleteTag(tagToDelete.id);
            if (activeTagFilter === tagToDelete.id) setActiveTagFilter(null);
          }
          setTagToDelete(null);
        }}
        onCancel={() => setTagToDelete(null)}
      />
    </div>
  );
}
