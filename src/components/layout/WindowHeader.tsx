import { Minus, X, Square } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { hideWindow } from '@/lib/window';

const isMac = navigator.platform.toUpperCase().includes('MAC');

export function WindowHeader() {
  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between px-2 cursor-move drag-region shrink-0 border-b border-foreground/[0.04] dark:border-white/[0.03]"
    >
      {/* macOS: traffic light buttons are native, we just leave space */}
      {isMac && <div className="w-16" />}

      {/* Draggable spacer */}
      <div className="flex-1" />

      {/* Windows/Linux: window controls */}
      {!isMac && (
        <div className="flex items-center no-drag">
          <button
            onClick={() => getCurrentWindow().minimize()}
            className="w-8 h-7 flex items-center justify-center hover:bg-foreground/[0.06] transition-colors cursor-pointer rounded-sm"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5 text-foreground/40" />
          </button>
          <button
            onClick={async () => {
              const win = getCurrentWindow();
              const maximized = await win.isMaximized();
              if (maximized) await win.unmaximize();
              else await win.maximize();
            }}
            className="w-8 h-7 flex items-center justify-center hover:bg-foreground/[0.06] transition-colors cursor-pointer rounded-sm"
            title="Maximize"
          >
            <Square className="w-3 h-3 text-foreground/40" />
          </button>
          <button
            onClick={() => hideWindow()}
            className="w-8 h-7 flex items-center justify-center hover:bg-red-500/10 transition-colors cursor-pointer rounded-sm group"
            title="Close"
          >
            <X className="w-3.5 h-3.5 text-foreground/40 group-hover:text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
}
