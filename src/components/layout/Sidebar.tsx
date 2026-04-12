import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { History, FileText, Lock, Settings } from 'lucide-react';
import { QlipLabIcon } from '@/components/icons/QlipLabIcon';
import { useAppStore, Tab } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { useSnippetStore } from '@/stores/snippetStore';
import { cn } from '@/lib/utils';

const topMenuItems: { id: Tab; icon: React.ElementType }[] = [
  { id: 'history', icon: History },
  { id: 'snippets', icon: FileText },
  { id: 'vault', icon: Lock },
];

const TAB_LABEL_KEYS: Record<Tab, string> = {
  history: 'sidebar.history',
  snippets: 'sidebar.snippets',
  vault: 'sidebar.vault',
  settings: 'sidebar.settings',
};

export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();
  const { t } = useTranslation();

  const handleTabChange = useCallback((tab: Tab) => {
    // Close side panels from other tabs before switching
    if (usePreviewStore.getState().isOpen) usePreviewStore.getState().close();
    if (useSnippetStore.getState().editorOpen) useSnippetStore.getState().closeEditor();
    setActiveTab(tab);
  }, [setActiveTab]);

  const renderTabButton = (id: Tab, Icon: React.ElementType) => {
    const label = t(TAB_LABEL_KEYS[id]);
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        role="tab"
        aria-selected={isActive}
        aria-label={label}
        onClick={() => handleTabChange(id)}
        className={cn(
          'group relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ease-out cursor-pointer no-drag outline-none focus:outline-none',
          isActive
            ? 'bg-accent/15 text-accent'
            : 'text-foreground/40 hover:text-foreground/70 hover:bg-surface-hover'
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="absolute left-full ms-2 px-2 py-1 bg-surface border border-border rounded-md text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
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
      {/* Brand Logo — also drag-friendly */}
      <div className="w-8 h-8 flex items-center justify-center">
        <QlipLabIcon size={24} />
      </div>

      {/* Top tabs */}
      <div role="tablist" aria-label="Navigation" className="flex flex-col items-center gap-1 mt-3 no-drag">
        {topMenuItems.map((item) => renderTabButton(item.id, item.icon))}
      </div>

      <div className="flex-1" />

      {/* Settings tab at bottom */}
      <div className="no-drag">
        {renderTabButton('settings', Settings)}
      </div>
    </div>
  );
}
