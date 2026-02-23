import { Search, X } from 'lucide-react';
import { useAppStore, Tab } from '@/stores/appStore';
import { cn } from '@/lib/utils';

const PLACEHOLDERS: Record<Tab, string> = {
  history: 'Search clips...',
  snippets: 'Search snippets...',
  vault: 'Search vault...',
  settings: 'Search settings...',
};

export function SearchBar() {
  const { searchQuery, setSearchQuery, activeTab } = useAppStore();
  return (
    <div className="h-11 px-3 py-2 elevation-bottom">
      <div className={cn('flex items-center gap-2 h-full px-3', 'bg-surface rounded-lg')}>
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={PLACEHOLDERS[activeTab]}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-surface-hover rounded cursor-pointer">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
