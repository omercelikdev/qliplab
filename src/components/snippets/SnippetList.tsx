import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Clipboard, Folder, FolderPlus, X } from 'lucide-react';
import { useSnippetStore } from '@/stores/snippetStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAppStore, SNIPPET_SYNTAX_FILTERS } from '@/stores/appStore';
import type { SnippetSyntaxFilter } from '@/stores/appStore';
import { SnippetItem } from './SnippetItem';
import { CrossTabSearchHints } from '@/components/layout/CrossTabSearchHints';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideWriteAndPaste } from '@/lib/window';
import { expandVariables } from '@/lib/snippetVariables';
import { cn } from '@/lib/utils';

export function SnippetList() {
  const { t } = useTranslation();
  const snippets = useSnippetStore((state) => state.snippets);
  const isLoading = useSnippetStore((state) => state.isLoading);
  const loadSnippets = useSnippetStore((state) => state.loadSnippets);
  const openEditor = useSnippetStore((state) => state.openEditor);
  const activeTab = useAppStore((state) => state.activeTab);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const snippetSyntaxFilter = useAppStore((state) => state.snippetSyntaxFilter);
  const setSnippetSyntaxFilter = useAppStore((state) => state.setSnippetSyntaxFilter);
  const categories = useSnippetStore((state) => state.categories);
  const selectedCategoryId = useSnippetStore((state) => state.selectedCategoryId);
  const setSelectedCategory = useSnippetStore((state) => state.setSelectedCategory);
  const createCategory = useSnippetStore((state) => state.createCategory);
  const deleteCategory = useSnippetStore((state) => state.deleteCategory);
  const loadCategories = useSnippetStore((state) => state.loadCategories);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // Reload from SQL when search/filter/folder changes
  useEffect(() => {
    const group = SNIPPET_SYNTAX_FILTERS[snippetSyntaxFilter];
    const favoritesOnly = snippetSyntaxFilter === 'favorites';
    loadSnippets(searchQuery, group.syntaxes ?? undefined, favoritesOnly, selectedCategoryId);
  }, [searchQuery, snippetSyntaxFilter, selectedCategoryId, loadSnippets]);

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (name) await createCategory(name);
    setNewFolderName('');
    setIsAddingFolder(false);
  }, [newFolderName, createCategory]);

  const pinnedCount = useMemo(() => snippets.filter(s => s.isPinned).length, [snippets]);

  const handleSelect = useCallback(async (index: number) => {
    const snippet = snippets[index];
    if (snippet) {
      const expanded = await expandVariables(snippet.content);
      await hideWriteAndPaste(async () => {
        await writeText(expanded);
      });
    }
  }, [snippets]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: snippets.length,
    onSelect: handleSelect,
    isActive: activeTab === 'snippets',
  });

  // Reset scroll to top when window reopens (matches selectedIndex reset to 0)
  const windowOpenCount = useAppStore((state) => state.windowOpenCount);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [windowOpenCount]);

  // Scroll selected item into view
  useEffect(() => {
    const itemEl = itemRefs.current.get(selectedIndex);
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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

  const filterEntries = Object.entries(SNIPPET_SYNTAX_FILTERS) as [SnippetSyntaxFilter, typeof SNIPPET_SYNTAX_FILTERS[SnippetSyntaxFilter]][];

  return (
    <div className="h-full flex flex-col">
      {/* Syntax filter bar — consistent with HistoryList/VaultList */}
      <div data-tauri-drag-region className="flex items-center gap-1 px-3 py-1.5 shrink-0 overflow-x-auto elevation-bottom cursor-move drag-region">
        {filterEntries.map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setSnippetSyntaxFilter(key)}
            className={cn(
              'px-2 py-0.5 text-[10px] rounded-md whitespace-nowrap transition-colors cursor-pointer no-drag',
              snippetSyntaxFilter === key
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-surface-hover'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Folder bar — organize snippets into collections */}
      <div className="flex items-center gap-1 px-3 py-1 shrink-0 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'flex items-center gap-1 ps-1.5 pe-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors cursor-pointer border',
            selectedCategoryId === null
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-muted-foreground hover:bg-surface-hover'
          )}
        >
          <Folder className="w-2.5 h-2.5" />
          {t('snippets.folders.all')}
        </button>
        {categories.map((cat) => (
          <div key={cat.id} className="group/folder relative flex items-center">
            <button
              onClick={() => setSelectedCategory(selectedCategoryId === cat.id ? null : cat.id)}
              className={cn(
                'flex items-center gap-1 ps-2 pe-1.5 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors cursor-pointer border',
                selectedCategoryId === cat.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:bg-surface-hover'
              )}
            >
              {cat.name}
              <span
                role="button"
                tabIndex={0}
                aria-label={t('common.delete')}
                onClick={(e) => { e.stopPropagation(); setFolderToDelete({ id: cat.id, name: cat.name }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setFolderToDelete({ id: cat.id, name: cat.name }); } }}
                className="opacity-0 group-hover/folder:opacity-100 focus-visible:opacity-100 transition-opacity hover:text-destructive cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </span>
            </button>
          </div>
        ))}
        {isAddingFolder ? (
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') { setIsAddingFolder(false); setNewFolderName(''); }
            }}
            placeholder={t('snippets.folders.namePlaceholder')}
            className="w-24 px-1.5 py-0.5 text-[10px] bg-surface border border-accent rounded-full outline-none no-drag"
          />
        ) : (
          <button
            onClick={() => setIsAddingFolder(true)}
            aria-label={t('snippets.folders.new')}
            title={t('snippets.folders.new')}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer no-drag"
          >
            <FolderPlus className="w-3 h-3" />
          </button>
        )}
      </div>

      <CrossTabSearchHints />

      <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {snippets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center max-w-[200px]">
              <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
                {searchQuery ? (
                  <Search className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <Clipboard className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">
                  {searchQuery ? t('common.noResults') : t('snippets.emptyState.title')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? t('snippets.noResults.description') : t('snippets.emptyState.description')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="ps-3 pe-1.5 py-1 space-y-0.5">
            {snippets.map((snippet, index) => (
              <div key={snippet.id}>
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
                  <SnippetItem snippet={snippet} isSelected={index === selectedIndex} onEdit={(s) => openEditor(s)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-1 elevation-top">
        <button
          onClick={() => openEditor()}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5 cursor-pointer',
            'text-xs text-muted-foreground',
            'hover:text-foreground hover:bg-surface-hover rounded-md transition-colors'
          )}
        >
          <Plus className="w-3.5 h-3.5" /> {t('snippets.newSnippet')}
        </button>
      </div>

      <ConfirmDialog
        isOpen={folderToDelete !== null}
        title={t('snippets.folders.deleteTitle')}
        message={t('snippets.folders.deleteMessage', { name: folderToDelete?.name ?? '' })}
        onConfirm={() => { if (folderToDelete) deleteCategory(folderToDelete.id); setFolderToDelete(null); }}
        onCancel={() => setFolderToDelete(null)}
      />
    </div>
  );
}
