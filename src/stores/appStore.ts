import { create } from 'zustand';
import type { DetectedFormat } from '@/types/clipboard';

export type Tab = 'history' | 'snippets' | 'vault' | 'settings';
export type Theme = 'light' | 'dark' | 'system';

/** Lightweight queue item — stores content so window.ts doesn't need historyStore */
export interface PasteQueueItem {
  id: string;
  content: string;
  htmlContent?: string;
  contentType: string;
}

// Format filter groups for smart collections
export type FormatFilterGroup = 'all' | 'pinned' | 'code' | 'data' | 'web' | 'encoded' | 'other';
export type VaultTypeFilter = 'all' | 'favorites' | 'card' | 'bank' | 'address' | 'personal' | 'company' | 'code';
export type SnippetSyntaxFilter = 'all' | 'favorites' | 'code' | 'data' | 'web' | 'plain';

export const SNIPPET_SYNTAX_FILTERS: Record<SnippetSyntaxFilter, { label: string; syntaxes: string[] | null }> = {
  all:       { label: 'All',       syntaxes: null },
  favorites: { label: 'Pinned',    syntaxes: null }, // special: filters by is_pinned = 1
  code:      { label: 'Code',      syntaxes: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'sql', 'shell'] },
  data:  { label: 'Data',  syntaxes: ['json', 'yaml', 'xml', 'csv'] },
  web:   { label: 'Web',   syntaxes: ['html', 'css', 'markdown'] },
  plain: { label: 'Plain', syntaxes: ['plain'] },
};

export const VAULT_TYPE_FILTERS: Record<VaultTypeFilter, string> = {
  all: 'All',
  favorites: 'Pinned',
  card: 'Card',
  bank: 'Bank',
  address: 'Address',
  personal: 'Personal',
  company: 'Company',
  code: 'Code',
};

export const FORMAT_FILTER_GROUPS: Record<FormatFilterGroup, { label: string; formats: DetectedFormat[] | null }> = {
  all:     { label: 'All',     formats: null }, // null = no filter
  pinned:  { label: 'Pinned',  formats: null }, // special: filters by is_pinned = 1
  code:    { label: 'Code',    formats: ['code_js', 'code_ts', 'code_python', 'code_go', 'code_rust', 'code_java', 'code_csharp', 'sql'] },
  data:    { label: 'Data',    formats: ['json', 'yaml', 'csv', 'xml'] },
  web:     { label: 'Web',     formats: ['url', 'url_encoded', 'html', 'markdown'] },
  encoded: { label: 'Encoded', formats: ['jwt', 'base64', 'hex'] },
  other:   { label: 'Other',   formats: null }, // catch-all: items not in any other group
};

// All formats that belong to a specific group (used by "Other" filter)
export const CATEGORIZED_FORMATS: Set<DetectedFormat> = new Set(
  Object.entries(FORMAT_FILTER_GROUPS)
    .filter(([key]) => key !== 'all' && key !== 'pinned' && key !== 'other')
    .flatMap(([, group]) => group.formats ?? [])
);

interface AppState {
  activeTab: Tab;
  previewOpen: boolean;
  theme: Theme;
  searchQuery: string;
  formatFilter: FormatFilterGroup;
  /** Name of the app clips must have been copied from. null = every app. */
  sourceAppFilter: string | null;
  vaultTypeFilter: VaultTypeFilter;
  snippetSyntaxFilter: SnippetSyntaxFilter;
  isTransformMode: boolean;
  isDiffMode: boolean;
  diffSelectedIds: string[];
  isQueueMode: boolean;
  pasteQueue: PasteQueueItem[];
  windowOpenCount: number; // Incremented each time window opens to trigger resets
  openMenuItemId: string | null; // Only one item menu open at a time

  setActiveTab: (tab: Tab) => void;
  setPreviewOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setSearchQuery: (query: string) => void;
  setFormatFilter: (filter: FormatFilterGroup) => void;
  setSourceAppFilter: (app: string | null) => void;
  setVaultTypeFilter: (filter: VaultTypeFilter) => void;
  setSnippetSyntaxFilter: (filter: SnippetSyntaxFilter) => void;
  setTransformMode: (active: boolean) => void;
  setDiffMode: (active: boolean) => void;
  addToDiffSelection: (id: string) => void;
  clearDiffSelection: () => void;
  setQueueMode: (active: boolean) => void;
  toggleQueueItem: (item: PasteQueueItem) => void;
  cancelQueue: () => void;
  setOpenMenuItemId: (id: string | null) => void;
  signalWindowOpen: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'history',
  previewOpen: false,
  theme: 'system',
  searchQuery: '',
  formatFilter: (localStorage.getItem('qlip_formatFilter') ?? 'all') as FormatFilterGroup,
  sourceAppFilter: localStorage.getItem('qlip_sourceAppFilter') || null,
  vaultTypeFilter: (localStorage.getItem('qlip_vaultTypeFilter') ?? 'all') as VaultTypeFilter,
  snippetSyntaxFilter: (localStorage.getItem('qlip_snippetSyntaxFilter') ?? 'all') as SnippetSyntaxFilter,
  isTransformMode: false,
  isDiffMode: false,
  diffSelectedIds: [],
  isQueueMode: false,
  pasteQueue: [],
  windowOpenCount: 0,
  openMenuItemId: null,

  setActiveTab: (tab) => {
    if (get().activeTab === tab) return;
    set({
      activeTab: tab,
      searchQuery: '',
      isDiffMode: false,
      diffSelectedIds: [],
      isQueueMode: false,
      pasteQueue: [],
      openMenuItemId: null,
    });
  },
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setTheme: (theme) => set({ theme }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFormatFilter: (filter) => {
    set({ formatFilter: filter });
    try { localStorage.setItem('qlip_formatFilter', filter); } catch { /* noop */ }
  },
  setSourceAppFilter: (app) => {
    set({ sourceAppFilter: app });
    try {
      if (app) localStorage.setItem('qlip_sourceAppFilter', app);
      else localStorage.removeItem('qlip_sourceAppFilter');
    } catch { /* noop */ }
  },
  setVaultTypeFilter: (filter) => {
    set({ vaultTypeFilter: filter });
    try { localStorage.setItem('qlip_vaultTypeFilter', filter); } catch { /* noop */ }
  },
  setSnippetSyntaxFilter: (filter) => {
    set({ snippetSyntaxFilter: filter });
    try { localStorage.setItem('qlip_snippetSyntaxFilter', filter); } catch { /* noop */ }
  },
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
  setQueueMode: (active) => set(active
    ? { isQueueMode: true, pasteQueue: [], isDiffMode: false, diffSelectedIds: [] }
    : { isQueueMode: false, pasteQueue: [] }),
  toggleQueueItem: (item) => set((state) => {
    const idx = state.pasteQueue.findIndex(q => q.id === item.id);
    if (idx >= 0) {
      return { pasteQueue: state.pasteQueue.filter(q => q.id !== item.id) };
    }
    return { pasteQueue: [...state.pasteQueue, { id: item.id, content: item.content, htmlContent: item.htmlContent, contentType: item.contentType }] };
  }),
  cancelQueue: () => set({ isQueueMode: false, pasteQueue: [] }),
  setOpenMenuItemId: (id) => set({ openMenuItemId: id }),
  // Signal window opened - reset selection/modes but KEEP search query (like Ditto)
  signalWindowOpen: () => set((state) => ({
    isDiffMode: false,
    diffSelectedIds: [],
    isTransformMode: false,
    isQueueMode: false,
    pasteQueue: [],
    windowOpenCount: state.windowOpenCount + 1,
    // NOTE: searchQuery is intentionally NOT reset - user can continue searching
  })),
}));
