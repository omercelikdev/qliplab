import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useSnippetStore } from '@/stores/snippetStore';
import { useAppStore } from '@/stores/appStore';
import { SnippetItem } from './SnippetItem';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideWriteAndPaste } from '@/lib/window';
import { fuzzyFilter } from '@/lib/fuzzySearch';
import { expandVariables } from '@/lib/snippetVariables';
import { cn } from '@/lib/utils';

export function SnippetList() {
  const snippets = useSnippetStore((state) => state.snippets);
  const isLoading = useSnippetStore((state) => state.isLoading);
  const loadSnippets = useSnippetStore((state) => state.loadSnippets);
  const openEditor = useSnippetStore((state) => state.openEditor);
  const activeTab = useAppStore((state) => state.activeTab);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  // Filter snippets by search query (fuzzy matching, sorted by relevance)
  const filteredSnippets = useMemo(
    () => fuzzyFilter(snippets, searchQuery, (s) => `${s.title} ${s.content}`),
    [snippets, searchQuery]
  );

  const handleSelect = useCallback(async (index: number) => {
    const snippet = filteredSnippets[index];
    if (snippet) {
      const expanded = await expandVariables(snippet.content);
      await hideWriteAndPaste(async () => {
        await writeText(expanded);
      });
    }
  }, [filteredSnippets]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: filteredSnippets.length,
    onSelect: handleSelect,
    isActive: activeTab === 'snippets',
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="pl-3 pr-1.5 py-1 space-y-0.5">
          {filteredSnippets.map((snippet, index) => (
            <div
              key={snippet.id}
              ref={(el) => {
                if (el) itemRefs.current.set(index, el);
                else itemRefs.current.delete(index);
              }}
            >
              <SnippetItem snippet={snippet} isSelected={index === selectedIndex} onEdit={(s) => openEditor(s)} />
            </div>
          ))}
          {snippets.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No snippets. Create one!
            </div>
          )}
          {filteredSnippets.length === 0 && snippets.length > 0 && searchQuery && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No results for "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-1 border-t border-border/50">
        <button
          onClick={() => openEditor()}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5 cursor-pointer',
            'text-xs text-muted-foreground',
            'hover:text-foreground hover:bg-surface-hover rounded-md transition-colors'
          )}
        >
          <Plus className="w-3.5 h-3.5" /> New Snippet
        </button>
      </div>
    </div>
  );
}
