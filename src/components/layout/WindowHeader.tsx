import { getCurrentWindow } from '@tauri-apps/api/window';
import { hideWindow } from '@/lib/window';

const isMac = navigator.platform.toUpperCase().includes('MAC');

/** Minimal system-style icons for window controls */
function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="text-foreground/50">
      <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="text-foreground/50">
      <rect x="1.5" y="1.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="text-foreground/50 group-hover:text-red-500">
      <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function WindowHeader() {
  return (
    <div
      data-tauri-drag-region
      className="h-5 flex items-center justify-end pe-1 cursor-move drag-region shrink-0 elevation-bottom"
    >
      {/* Windows/Linux: compact window controls */}
      {!isMac && (
        <div className="flex items-center no-drag">
          <button
            onClick={() => getCurrentWindow().minimize()}
            className="w-6 h-5 flex items-center justify-center hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <MinimizeIcon />
          </button>
          <button
            onClick={async () => {
              const win = getCurrentWindow();
              const maximized = await win.isMaximized();
              if (maximized) await win.unmaximize();
              else await win.maximize();
            }}
            className="w-6 h-5 flex items-center justify-center hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <MaximizeIcon />
          </button>
          <button
            onClick={() => hideWindow()}
            className="w-6 h-5 flex items-center justify-center hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors cursor-pointer group"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
