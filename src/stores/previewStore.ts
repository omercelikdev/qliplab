import { create } from 'zustand';
import { expandWindowForPreview, shrinkWindowFromPreview } from '@/lib/window';
import type { ClipboardItem } from '@/types/clipboard';
import type { DetectedFormat } from '@/types/clipboard';

export type PreviewMode = 'transform' | 'diff' | 'view';
export type DiffViewMode = 'side-by-side' | 'inline';

export interface PipelineStep {
  transformId: string;
  label: string;
  output: string;
}

interface PreviewState {
  isOpen: boolean;
  mode: PreviewMode;
  sourceItem: ClipboardItem | null;
  transformedContent: string;
  editedContent: string;
  transformType: string;
  diffItems: [ClipboardItem | null, ClipboardItem | null];
  diffViewMode: DiffViewMode;
  pipelineSteps: PipelineStep[];
  /** True while a close is being confirmed because the edit is unsaved. */
  pendingClose: boolean;

  openTransform: (item: ClipboardItem, type: string, content: string) => void;
  openDiff: (items: [ClipboardItem, ClipboardItem]) => void;
  openView: (item: ClipboardItem) => void;
  setEditedContent: (content: string) => void;
  setDiffViewMode: (mode: DiffViewMode) => void;
  addPipelineStep: (transformId: string, label: string, output: string) => void;
  removePipelineStep: (index: number) => void;
  clearPipeline: () => void;
  /** Whether the view is a dirty edit (content changed from the source). */
  isViewDirty: () => boolean;
  /** After saving, mark the current content as the clean baseline. */
  markSaved: (content: string) => void;
  /** Close, but confirm first if there's an unsaved edit. */
  requestClose: () => void;
  confirmClose: () => void;
  cancelClose: () => void;
  close: () => void;
}

// Map DetectedFormat to Monaco language
export function getMonacoLanguage(format: DetectedFormat): string {
  const languageMap: Record<string, string> = {
    json: 'json',
    yaml: 'yaml',
    xml: 'xml',
    html: 'html',
    markdown: 'markdown',
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
  pipelineSteps: [],
  pendingClose: false,

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

  addPipelineStep: (transformId, label, output) => {
    const steps = [...get().pipelineSteps, { transformId, label, output }];
    set({
      pipelineSteps: steps,
      editedContent: output,
      transformedContent: output,
      transformType: steps.map(s => s.label).join(' → '),
    });
  },

  removePipelineStep: (index) => {
    const steps = get().pipelineSteps.filter((_, i) => i !== index);
    if (steps.length === 0) {
      // No more steps — revert to source content
      const source = get().sourceItem?.content ?? '';
      set({
        pipelineSteps: [],
        editedContent: source,
        transformedContent: source,
        transformType: 'View',
        mode: 'view',
      });
    } else {
      // Use the last step's output
      const lastOutput = steps[steps.length - 1].output;
      set({
        pipelineSteps: steps,
        editedContent: lastOutput,
        transformedContent: lastOutput,
        transformType: steps.map(s => s.label).join(' → '),
      });
    }
  },

  clearPipeline: () => {
    const source = get().sourceItem?.content ?? '';
    set({
      pipelineSteps: [],
      editedContent: source,
      transformedContent: source,
      transformType: 'View',
      mode: 'view',
    });
  },

  isViewDirty: () => {
    const { mode, sourceItem, editedContent } = get();
    return mode === 'view' && !!sourceItem && sourceItem.contentType !== 'image'
      && editedContent !== sourceItem.content;
  },

  markSaved: (content) => {
    const { sourceItem } = get();
    if (sourceItem) set({ sourceItem: { ...sourceItem, content }, editedContent: content });
  },

  requestClose: () => {
    if (get().isViewDirty()) set({ pendingClose: true });
    else get().close();
  },

  confirmClose: () => {
    set({ pendingClose: false });
    get().close();
  },

  cancelClose: () => set({ pendingClose: false }),

  close: () => {
    set({ isOpen: false, pendingClose: false, pipelineSteps: [] });
    shrinkWindowFromPreview();
  },
}));
