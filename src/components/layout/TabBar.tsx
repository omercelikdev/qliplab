import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore, Tab } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { History, FileText, Lock, Settings } from 'lucide-react';
import { SettingsDialog } from '../settings/SettingsDialog';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'history', label: 'History', icon: History },
  { id: 'snippets', label: 'Snippets', icon: FileText },
  { id: 'vault', label: 'Vault', icon: Lock },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleMouseDown = async (e: React.MouseEvent) => {
    // Only drag on left mouse button and not on interactive elements
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) {
      return;
    }
    try {
      const window = getCurrentWindow();
      await window.startDragging();
    } catch (error) {
      console.error('Failed to start dragging:', error);
    }
  };

  return (
    <>
      <div
        className="h-10 flex items-center justify-between px-3 cursor-move border-b border-border/50"
        onMouseDown={handleMouseDown}
      >
        {/* Tabs */}
        <div className="flex items-center bg-surface/80 rounded-lg p-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer',
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

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-md hover:bg-surface transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
