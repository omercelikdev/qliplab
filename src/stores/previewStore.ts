import { create } from 'zustand';
import { expandWindowForPreview, shrinkWindowFromPreview } from '@/lib/window';
import type { ClipboardItem } from '@/types/clipboard';

export type PreviewMode = 'transform' | 'diff';

interface PreviewState {
  isOpen: boolean;
  mode: PreviewMode;
  sourceItem: ClipboardItem | null;
  transformedContent: string;
  transformType: string;
  diffItems: [ClipboardItem | null, ClipboardItem | null];

  openTransform: (item: ClipboardItem, type: string, content: string) => void;
  openDiff: (items: [ClipboardItem, ClipboardItem]) => void;
  close: () => void;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  isOpen: false,
  mode: 'transform',
  sourceItem: null,
  transformedContent: '',
  transformType: '',
  diffItems: [null, null],

  openTransform: (item, type, content) => {
    const wasOpen = get().isOpen;
    set({
      isOpen: true, mode: 'transform', sourceItem: item, transformType: type, transformedContent: content,
    });
    if (!wasOpen) {
      expandWindowForPreview();
    }
  },

  openDiff: (items) => {
    const wasOpen = get().isOpen;
    set({ isOpen: true, mode: 'diff', diffItems: items });
    if (!wasOpen) {
      expandWindowForPreview();
    }
  },

  close: () => {
    set({ isOpen: false, sourceItem: null, transformedContent: '', diffItems: [null, null] });
    shrinkWindowFromPreview();
  },
}));
