import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { hideWindow } from '@/lib/window';

const isMac = navigator.platform.toUpperCase().includes('MAC');

/** Windows/Linux — minimal SVG icons */
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

function CloseIconWin() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="text-foreground/50 group-hover:text-red-500">
      <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** macOS — traffic light dots (red/yellow/green) */
function MacTrafficLights() {
  const [hovered, setHovered] = useState(false);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    hideWindow();
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    getCurrentWindow().minimize();
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    if (maximized) await win.unmaximize();
    else await win.maximize();
  };

  return (
    <div
      className="flex items-center gap-[6px] ps-2 no-drag"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Close — red */}
      <button onClick={handleClose} className="w-3.5 h-3.5 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all cursor-pointer flex items-center justify-center">
        {hovered && (
          <svg width="6" height="6" viewBox="0 0 6 6">
            <line x1="1" y1="1" x2="5" y2="5" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="5" y1="1" x2="1" y2="5" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {/* Minimize — yellow */}
      <button onClick={handleMinimize} className="w-3.5 h-3.5 rounded-full bg-[#FEBC2E] hover:brightness-90 transition-all cursor-pointer flex items-center justify-center">
        {hovered && (
          <svg width="6" height="6" viewBox="0 0 6 6">
            <line x1="1" y1="3" x2="5" y2="3" stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {/* Maximize — green */}
      <button onClick={handleMaximize} className="w-3.5 h-3.5 rounded-full bg-[#28C840] hover:brightness-90 transition-all cursor-pointer flex items-center justify-center">
        {hovered && (
          <svg width="6" height="6" viewBox="0 0 6 6">
            <polyline points="1,3.5 3,1.5 5,3.5" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="1,2.5 3,4.5 5,2.5" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function WindowHeader() {
  return (
    <div
      data-tauri-drag-region
      className="h-7 flex items-center cursor-move drag-region shrink-0 elevation-bottom"
    >
      {/* macOS: traffic lights on the left */}
      {isMac && <MacTrafficLights />}

      {/* Draggable spacer */}
      <div className="flex-1" />

      {/* Windows/Linux: controls on the right */}
      {!isMac && (
        <div className="flex items-center no-drag pe-1">
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
            <CloseIconWin />
          </button>
        </div>
      )}
    </div>
  );
}
