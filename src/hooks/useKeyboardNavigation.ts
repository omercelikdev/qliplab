import { useState, useEffect, useCallback } from 'react';
import { usePreviewStore } from '@/stores/previewStore';
import { useAppStore } from '@/stores/appStore';

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

      // Don't handle if focus is in an input or editor
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

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
          Promise.resolve(onSelect(selectedIndex)).catch((err) => {
            console.error('Selection failed:', err);
          });
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
