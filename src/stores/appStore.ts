import { create } from 'zustand';
import type { DetectedFormat } from '@/types/clipboard';

export type Tab = 'history' | 'snippets' | 'vault';
export type Theme = 'light' | 'dark' | 'system';

// Format filter groups for smart collections
export type FormatFilterGroup = 'all' | 'code' | 'data' | 'web' | 'encoded' | 'other';

export const FORMAT_FILTER_GROUPS: Record<FormatFilterGroup, { label: string; formats: DetectedFormat[] | null }> = {
  all:     { label: 'All',     formats: null }, // null = no filter
  code:    { label: 'Code',    formats: ['code_js', 'code_ts', 'code_python', 'code_go', 'code_rust', 'code_java', 'code_csharp', 'sql'] },
  data:    { label: 'Data',    formats: ['json', 'yaml', 'csv', 'xml'] },
  web:     { label: 'Web',     formats: ['url', 'url_encoded', 'html', 'markdown'] },
  encoded: { label: 'Encoded', formats: ['jwt', 'base64', 'hex'] },
  other:   { label: 'Other',   formats: null }, // catch-all: items not in any other group
};

// All formats that belong to a specific group (used by "Other" filter)
export const CATEGORIZED_FORMATS: Set<DetectedFormat> = new Set(
  Object.entries(FORMAT_FILTER_GROUPS)
    .filter(([key]) => key !== 'all' && key !== 'other')
    .flatMap(([, group]) => group.formats ?? [])
);

interface AppState {
  activeTab: Tab;
  previewOpen: boolean;
  theme: Theme;
  searchQuery: string;
  formatFilter: FormatFilterGroup;
  isTransformMode: boolean;
  isDiffMode: boolean;
  diffSelectedIds: string[];
  windowOpenCount: number; // Incremented each time window opens to trigger resets
  openMenuItemId: string | null; // Only one item menu open at a time

  setActiveTab: (tab: Tab) => void;
  setPreviewOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setSearchQuery: (query: string) => void;
  setFormatFilter: (filter: FormatFilterGroup) => void;
  setTransformMode: (active: boolean) => void;
  setDiffMode: (active: boolean) => void;
  addToDiffSelection: (id: string) => void;
  clearDiffSelection: () => void;
  setOpenMenuItemId: (id: string | null) => void;
  signalWindowOpen: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'history',
  previewOpen: false,
  theme: 'system',
  searchQuery: '',
  formatFilter: 'all',
  isTransformMode: false,
  isDiffMode: false,
  diffSelectedIds: [],
  windowOpenCount: 0,
  openMenuItemId: null,

  setActiveTab: (tab) => set({ activeTab: tab, searchQuery: '', formatFilter: 'all' }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setTheme: (theme) => set({ theme }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFormatFilter: (filter) => set({ formatFilter: filter }),
  setTransformMode: (active) => set({ isTransformMode: active }),
  setDiffMode: (active) => set({ isDiffMode: active, diffSelectedIds: active ? [] : [] }),
  addToDiffSelection: (id) => set((state) => {
    // Don't add duplicate IDs
    if (state.diffSelectedIds.includes(id)) {
      return state;
    }
    return {
      diffSelectedIds: [...state.diffSelectedIds, id].slice(-2)
    };
  }),
  clearDiffSelection: () => set({ diffSelectedIds: [] }),
  setOpenMenuItemId: (id) => set({ openMenuItemId: id }),
  // Signal window opened - reset selection/modes but KEEP search query (like Ditto)
  signalWindowOpen: () => set((state) => ({
    isDiffMode: false,
    diffSelectedIds: [],
    isTransformMode: false,
    windowOpenCount: state.windowOpenCount + 1,
    // NOTE: searchQuery is intentionally NOT reset - user can continue searching
  })),
}));
