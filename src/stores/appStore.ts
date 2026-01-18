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

  setActiveTab: (tab: Tab) => void;
  setPreviewOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setSearchQuery: (query: string) => void;
  setTransformMode: (active: boolean) => void;
  setDiffMode: (active: boolean) => void;
  addToDiffSelection: (id: string) => void;
  clearDiffSelection: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'history',
  previewOpen: false,
  theme: 'system',
  searchQuery: '',
  isTransformMode: false,
  isDiffMode: false,
  diffSelectedIds: [],

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
}));
