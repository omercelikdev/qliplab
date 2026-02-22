import { useRef, useEffect, useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore, Tab } from '@/stores/appStore';

const PLACEHOLDERS: Record<Tab, string> = {
  history: 'Search clips...',
  snippets: 'Search snippets...',
  vault: 'Search vault...',
  settings: 'Search settings...',
};

const DEBOUNCE_MS = 120;

export function SearchBar() {
  const { searchQuery, setSearchQuery, activeTab } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local input value for instant feedback — store updates after debounce
  const [localValue, setLocalValue] = useState(searchQuery);

  // Sync local value when store clears (e.g. tab switch)
  useEffect(() => {
    if (searchQuery === '') setLocalValue('');
  }, [searchQuery]);

  const handleChange = useCallback((value: string) => {
    setLocalValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, DEBOUNCE_MS);
  }, [setSearchQuery]);

  const handleClear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalValue('');
    setSearchQuery('');
  }, [setSearchQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Auto-focus search when user starts typing (like Spotlight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey ||
          e.key.startsWith('F') || e.key.startsWith('Arrow') ||
          ['Escape', 'Tab', 'Enter', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

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
        className="flex-1 flex items-center gap-2 h-8 px-2.5 bg-surface rounded-md cursor-text no-drag transition-shadow duration-150 ease-out focus-within:ring-2 focus-within:ring-accent/15 focus-within:border-accent/40"
        onClick={() => inputRef.current?.focus()}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={PLACEHOLDERS[activeTab]}
          value={localValue}
          onChange={(e) => handleChange(e.target.value.slice(0, 200))}
          maxLength={200}
          data-search-input
          className="flex-1 bg-transparent outline-none text-xs placeholder:text-foreground/25 cursor-text"
        />
        {localValue && (
          <button
            onClick={handleClear}
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
