import { useState, useEffect, useCallback } from 'react';

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive || itemCount === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % itemCount);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(selectedIndex);
          break;
      }
    },
    [isActive, itemCount, selectedIndex, onSelect]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { selectedIndex, setSelectedIndex };
}
