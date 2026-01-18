import { useState } from 'react';
import { Settings } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { cn } from '@/lib/utils';

export function DragBar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleMouseDown = async (e: React.MouseEvent) => {
    // Only drag on left mouse button and not on buttons
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
        className={cn('h-8 flex items-center justify-between px-3 cursor-move', 'border-b border-border/50')}
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1" />
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1 hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
