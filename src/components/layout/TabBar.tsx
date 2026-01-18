import { useAppStore, Tab } from '@/stores/appStore';
import { cn } from '@/lib/utils';

const tabs: { id: Tab; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'snippets', label: 'Snippets' },
  { id: 'vault', label: 'Vault' },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useAppStore();
  return (
    <div className="h-10 flex items-center gap-1 px-3 border-b border-border/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer',
            activeTab === tab.id ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
