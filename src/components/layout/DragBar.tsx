import { useRef, useEffect } from 'react';
import { Clipboard, Search, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore, Tab } from '@/stores/appStore';
import { cn } from '@/lib/utils';

const PLACEHOLDERS: Record<Tab, string> = {
  history: 'Search clips...',
  snippets: 'Search snippets...',
  vault: 'Search vault...',
};

export function DragBar() {
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
        // Don't prevent default - let the character be typed
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = async (e: React.MouseEvent) => {
    // Only drag on left mouse button and not on interactive elements
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, input')) {
      return;
    }

    try {
      const window = getCurrentWindow();
      await window.startDragging();
    } catch (error) {
      console.error('Failed to start dragging:', error);
    }
  };

  return (
    <div
      className={cn('h-11 flex items-center gap-3 px-3 cursor-move', 'border-b border-border/50')}
      onMouseDown={handleMouseDown}
    >
      {/* Branding */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
          <Clipboard className="w-3 h-3 text-accent-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">qliplab</span>
      </div>

      {/* Search */}
      <div
        className="flex-1 flex items-center gap-2 h-7 px-2.5 bg-surface rounded-md cursor-text"
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
