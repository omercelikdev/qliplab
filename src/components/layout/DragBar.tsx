import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { barEndInset } from '@/lib/platform';

const DEBOUNCE_MS = 120;

export function SearchBar() {
  const { t } = useTranslation();
  const { searchQuery, setSearchQuery, activeTab, windowOpenCount } = useAppStore();
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

  // Put the caret in the search box on every window open (settings tab hides
  // the bar, so inputRef is simply null there). This lets the user type to
  // filter straight away and takes focus off whichever sidebar button the OS
  // restored it to — otherwise that restore reads as focus-visible and paints
  // a stray ring on launch.
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [windowOpenCount]);

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
    <div
      data-tauri-drag-region
      style={{ paddingInlineEnd: barEndInset() }}
      className="h-11 flex items-center ps-3 pt-2 cursor-move drag-region"
    >
      <div
        role="search"
        className="flex-1 flex items-center gap-2 h-8 px-2.5 bg-surface rounded-md cursor-text no-drag"
        onClick={() => inputRef.current?.focus()}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={t(`search.${activeTab}`)}
          value={localValue}
          onChange={(e) => handleChange(e.target.value.slice(0, 200))}
          maxLength={200}
          aria-label={t(`search.${activeTab}`)}
          data-search-input
          className="flex-1 bg-transparent outline-none text-xs placeholder:text-foreground/45 cursor-text"
        />
        {localValue && (
          <button
            onClick={handleClear}
            aria-label={t('common.clearSearch')}
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
