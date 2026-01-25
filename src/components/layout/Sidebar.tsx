import { useState } from 'react';
import { Clipboard, History, FileText, Lock, Settings } from 'lucide-react';
import { useAppStore, Tab } from '@/stores/appStore';
import { SettingsDialog } from '../settings/SettingsDialog';
import { cn } from '@/lib/utils';

const menuItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'history', label: 'History', icon: History },
  { id: 'snippets', label: 'Snippets', icon: FileText },
  { id: 'vault', label: 'Vault', icon: Lock },
];

export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div
        data-tauri-drag-region
        className="w-11 h-full flex flex-col items-center pt-2 pb-[6px] elevation-right cursor-move shrink-0 drag-region"
      >
        {/* Brand Logo - aligns with search field */}
        <div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-sm no-drag"
        >
          <Clipboard className="w-4 h-4 text-accent-foreground" />
        </div>

        {/* Menu Items - aligns with list items */}
        <div className="flex flex-col items-center gap-1 mt-3 no-drag">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'group relative w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer no-drag',
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-foreground/70 hover:text-foreground hover:bg-surface-hover'
                )}
              >
                <Icon className="w-4 h-4" />
                {/* Tooltip */}
                <span className="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded-md text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Settings at bottom */}
        <button
          onClick={() => setShowSettings(true)}
          className="group relative w-8 h-8 flex items-center justify-center rounded-md text-foreground/70 hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer no-drag"
        >
          <Settings className="w-4 h-4" />
          {/* Tooltip */}
          <span className="absolute left-full ml-2 px-2 py-1 bg-surface border border-border rounded-md text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
            Settings
          </span>
        </button>
      </div>

      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
