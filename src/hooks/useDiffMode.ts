import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useHistoryStore } from '@/stores/historyStore';

export function useDiffMode() {
  const isDiffMode = useAppStore((state) => state.isDiffMode);
  const setDiffMode = useAppStore((state) => state.setDiffMode);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const clearDiffSelection = useAppStore((state) => state.clearDiffSelection);
  const openDiff = usePreviewStore((state) => state.openDiff);
  const items = useHistoryStore((state) => state.items);

  // Toggle diff mode with Alt+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key repeat (holding down the key)
      if (e.repeat) return;

      // macOS: Option+D produces '∂', so check both key and code
      if (e.altKey && (e.key === 'd' || e.key === '∂' || e.code === 'KeyD')) {
        e.preventDefault();

        const currentIsDiffMode = useAppStore.getState().isDiffMode;
        const { isOpen, close } = usePreviewStore.getState();

        // If any panel is open, close it and enter diff selection mode
        if (isOpen) {
          close();
          if (!currentIsDiffMode) {
            setDiffMode(true);
          }
          return;
        }

        // No panel open - toggle diff selection mode
        if (currentIsDiffMode) {
          clearDiffSelection();
          setDiffMode(false);
        } else {
          setDiffMode(true);
        }
      }

      // Escape to close preview, exit queue mode, or exit diff mode
      if (e.key === 'Escape') {
        const previewOpen = usePreviewStore.getState().isOpen;
        const closePreview = usePreviewStore.getState().close;

        if (previewOpen) {
          closePreview();
        } else if (useAppStore.getState().isQueueMode) {
          useAppStore.getState().cancelQueue();
        } else {
          const currentIsDiffMode = useAppStore.getState().isDiffMode;
          if (currentIsDiffMode) {
            setDiffMode(false);
            clearDiffSelection();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setDiffMode, clearDiffSelection]);

  // Open diff when 2 items selected
  useEffect(() => {
    if (diffSelectedIds.length === 2) {
      const item1 = items.find(i => i.id === diffSelectedIds[0]);
      const item2 = items.find(i => i.id === diffSelectedIds[1]);
      if (item1 && item2) {
        openDiff([item1, item2]);
        clearDiffSelection();
        setDiffMode(false);
      }
    }
  }, [diffSelectedIds, items, openDiff, clearDiffSelection, setDiffMode]);

  return { isDiffMode };
}
