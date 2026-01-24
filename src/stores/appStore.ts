import { create } from 'zustand';

export type Tab = 'history' | 'snippets' | 'vault';
export type Theme = 'light' | 'dark' | 'system';

interface AppState {
  activeTab: Tab;
  previewOpen: boolean;
  theme: Theme;
  searchQuery: string;
  isTransformMode: boolean;
  isDiffMode: boolean;
  diffSelectedIds: string[];
  windowOpenCount: number; // Incremented each time window opens to trigger resets

  setActiveTab: (tab: Tab) => void;
  setPreviewOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setSearchQuery: (query: string) => void;
  setTransformMode: (active: boolean) => void;
  setDiffMode: (active: boolean) => void;
  addToDiffSelection: (id: string) => void;
  clearDiffSelection: () => void;
  signalWindowOpen: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'history',
  previewOpen: false,
  theme: 'system',
  searchQuery: '',
  isTransformMode: false,
  isDiffMode: false,
  diffSelectedIds: [],
  windowOpenCount: 0,

  setActiveTab: (tab) => set({ activeTab: tab, searchQuery: '' }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setTheme: (theme) => set({ theme }),
  setSearchQuery: (query) => set({ searchQuery: query }),
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
  // Signal window opened - reset selection/modes but KEEP search query (like Ditto)
  signalWindowOpen: () => set((state) => ({
    isDiffMode: false,
    diffSelectedIds: [],
    isTransformMode: false,
    windowOpenCount: state.windowOpenCount + 1,
    // NOTE: searchQuery is intentionally NOT reset - user can continue searching
  })),
}));
