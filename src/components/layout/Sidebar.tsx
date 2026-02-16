import { Clipboard, History, FileText, Lock, Settings } from 'lucide-react';
import { useAppStore, Tab } from '@/stores/appStore';
import { cn } from '@/lib/utils';

const topMenuItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'history', label: 'History', icon: History },
  { id: 'snippets', label: 'Snippets', icon: FileText },
  { id: 'vault', label: 'Vault', icon: Lock },
];

export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();

  const renderTabButton = (id: Tab, label: string, Icon: React.ElementType) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        className={cn(
          'group relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ease-out cursor-pointer no-drag',
          isActive
            ? 'bg-accent/15 text-accent'
            : 'text-foreground/40 hover:text-foreground/70 hover:bg-surface-hover'
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded-md text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
          {label}
        </span>
      </button>
    );
  };

  return (
    <div
      data-tauri-drag-region
      className="w-11 h-full flex flex-col items-center pt-2 pb-[6px] elevation-right cursor-move shrink-0 drag-region"
    >
      {/* Brand Logo */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-[0_2px_8px_var(--color-accent)/10] no-drag">
        <Clipboard className="w-4 h-4 text-accent-foreground" />
      </div>

      {/* Top tabs */}
      <div className="flex flex-col items-center gap-1 mt-3 no-drag">
        {topMenuItems.map((item) => renderTabButton(item.id, item.label, item.icon))}
      </div>

      <div className="flex-1" />

      {/* Settings tab at bottom */}
      <div className="no-drag">
        {renderTabButton('settings', 'Settings', Settings)}
      </div>
    </div>
  );
}
