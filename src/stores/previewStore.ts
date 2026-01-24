import { create } from 'zustand';
import { expandWindowForPreview, shrinkWindowFromPreview } from '@/lib/window';
import type { ClipboardItem } from '@/types/clipboard';
import type { DetectedFormat } from '@/types/clipboard';

export type PreviewMode = 'transform' | 'diff' | 'view';
export type DiffViewMode = 'side-by-side' | 'inline';

interface PreviewState {
  isOpen: boolean;
  mode: PreviewMode;
  sourceItem: ClipboardItem | null;
  transformedContent: string;
  editedContent: string;
  transformType: string;
  diffItems: [ClipboardItem | null, ClipboardItem | null];
  diffViewMode: DiffViewMode;

  openTransform: (item: ClipboardItem, type: string, content: string) => void;
  openDiff: (items: [ClipboardItem, ClipboardItem]) => void;
  openView: (item: ClipboardItem) => void;
  setEditedContent: (content: string) => void;
  setDiffViewMode: (mode: DiffViewMode) => void;
  close: () => void;
}

// Map DetectedFormat to Monaco language
export function getMonacoLanguage(format: DetectedFormat): string {
  const languageMap: Record<string, string> = {
    json: 'json',
    yaml: 'yaml',
    xml: 'xml',
    html: 'html',
    sql: 'sql',
    css: 'css',
    code_js: 'javascript',
    code_ts: 'typescript',
    code_python: 'python',
    code_go: 'go',
    code_rust: 'rust',
    code_java: 'java',
    code_csharp: 'csharp',
  };
  return languageMap[format] || 'plaintext';
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  isOpen: false,
  mode: 'transform',
  sourceItem: null,
  transformedContent: '',
  editedContent: '',
  transformType: '',
  diffItems: [null, null],
  diffViewMode: 'side-by-side',

  openTransform: (item, type, content) => {
    const wasOpen = get().isOpen;
    set({
      isOpen: true,
      mode: 'transform',
      sourceItem: item,
      transformType: type,
      transformedContent: content,
      editedContent: content,
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

  openView: (item) => {
    const wasOpen = get().isOpen;
    set({
      isOpen: true,
      mode: 'view',
      sourceItem: item,
      transformedContent: item.content,
      editedContent: item.content,
    });
    if (!wasOpen) {
      expandWindowForPreview();
    }
  },

  setEditedContent: (content) => {
    set({ editedContent: content });
  },

  setDiffViewMode: (mode) => {
    set({ diffViewMode: mode });
  },

  close: () => {
    set({ isOpen: false });
    shrinkWindowFromPreview();
  },
}));
