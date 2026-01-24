import { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore, Tab } from '@/stores/appStore';

const PLACEHOLDERS: Record<Tab, string> = {
  history: 'Search clips...',
  snippets: 'Search snippets...',
  vault: 'Search vault...',
};

export function SearchBar() {
  const { searchQuery, setSearchQuery, activeTab } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search when user starts typing (like Spotlight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if already focused on an input
      if (document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore modifier keys, function keys, and navigation keys
      if (e.metaKey || e.ctrlKey || e.altKey ||
          e.key.startsWith('F') || e.key.startsWith('Arrow') ||
          ['Escape', 'Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      // If it's a printable character, focus search and let the character be typed
      if (e.key.length === 1) {
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div data-tauri-drag-region className="h-12 flex items-start px-3 pt-2 cursor-move drag-region">
      <div
        className="flex-1 flex items-center gap-2 h-8 px-2.5 bg-surface rounded-md cursor-text no-drag"
        onClick={() => inputRef.current?.focus()}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={PLACEHOLDERS[activeTab]}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-xs placeholder:text-muted-foreground cursor-text"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-0.5 hover:bg-surface-hover rounded cursor-pointer"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// Keep old export for compatibility during transition
export const DragBar = SearchBar;
