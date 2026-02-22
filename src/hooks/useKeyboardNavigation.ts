import { useState, useEffect, useCallback } from 'react';
import { usePreviewStore } from '@/stores/previewStore';
import { useAppStore } from '@/stores/appStore';

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  onDelete?: (index: number) => void;
  isActive: boolean;
}

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onDelete,
  isActive,
}: UseKeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastKey, setLastKey] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const isPreviewOpen = usePreviewStore((state) => state.isOpen);
  const windowOpenCount = useAppStore((state) => state.windowOpenCount);

  // Reset selection when item count changes
  useEffect(() => {
    if (selectedIndex >= itemCount) {
      setSelectedIndex(Math.max(0, itemCount - 1));
    }
  }, [itemCount, selectedIndex]);

  // Reset to first item when becoming active
  useEffect(() => {
    if (isActive) {
      setSelectedIndex(0);
    }
  }, [isActive]);

  // Reset to first item when window reopens
  useEffect(() => {
    setSelectedIndex(0);
  }, [windowOpenCount]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle keyboard navigation when preview/editor is open
      if (!isActive || itemCount === 0 || isPreviewOpen) return;

      // Don't handle if focus is in an input or editor
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const now = Date.now();

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, itemCount - 1));
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          Promise.resolve(onSelect(selectedIndex)).catch((err) => {
            console.error('Selection failed:', err);
          });
          break;
        case '/': {
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
          searchInput?.focus();
          break;
        }
        case 'g':
          if (lastKey === 'g' && now - lastKeyTime < 500) {
            e.preventDefault();
            setSelectedIndex(0);
          }
          break;
        case 'G':
          e.preventDefault();
          setSelectedIndex(itemCount - 1);
          break;
        case 'd':
          if (lastKey === 'd' && now - lastKeyTime < 500 && onDelete) {
            e.preventDefault();
            onDelete(selectedIndex);
          }
          break;
      }

      setLastKey(e.key);
      setLastKeyTime(now);
    },
    [isActive, itemCount, selectedIndex, onSelect, onDelete, isPreviewOpen, lastKey, lastKeyTime]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { selectedIndex, setSelectedIndex };
}
