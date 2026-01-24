import { useAppStore, Tab } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { History, FileText, Lock } from 'lucide-react';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'history', label: 'History', icon: History },
  { id: 'snippets', label: 'Snippets', icon: FileText },
  { id: 'vault', label: 'Vault', icon: Lock },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="h-11 flex items-center px-3">
      {/* Pill container */}
      <div className="flex items-center bg-surface/80 rounded-lg p-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
