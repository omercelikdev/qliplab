import { useState, useEffect, useCallback } from 'react';
import { usePreviewStore } from '@/stores/previewStore';
import { useAppStore } from '@/stores/appStore';
import { quickPasteIndex } from '@/lib/quickPaste';
import { blocksListNavigation, toNavigationTarget } from '@/lib/keyboardNav';

const isMac = navigator.platform.toUpperCase().includes('MAC');

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  isActive: boolean;
}

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  isActive,
}: UseKeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
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

      // Quick-paste is checked before the input guard: Cmd/Ctrl+1..9 types no
      // character, so it should work while the user is still filtering.
      const quickIndex = quickPasteIndex(e, isMac);
      if (quickIndex !== null) {
        if (quickIndex < itemCount) {
          e.preventDefault();
          setSelectedIndex(quickIndex);
          Promise.resolve(onSelect(quickIndex)).catch(() => {});
        }
        return;
      }

      // The search box keeps focus so the user can type straight away; arrows
      // and Enter still drive the list. Any other field keeps its own keys.
      if (blocksListNavigation(toNavigationTarget(e.target as HTMLElement))) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, itemCount - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          Promise.resolve(onSelect(selectedIndex)).catch(() => {});
          break;
      }
    },
    [isActive, itemCount, selectedIndex, onSelect, isPreviewOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { selectedIndex, setSelectedIndex };
}
