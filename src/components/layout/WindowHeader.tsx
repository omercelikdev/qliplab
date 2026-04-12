import { useState } from 'react';
import { hideWindow } from '@/lib/window';

const isMac = navigator.platform.toUpperCase().includes('MAC');

/** macOS — single red close dot (hides window to background) */
function MacCloseButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="ps-2.5 no-drag">
      <button
        onClick={(e) => { e.stopPropagation(); hideWindow(); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-3.5 h-3.5 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all cursor-pointer flex items-center justify-center"
      >
        {hovered && (
          <svg width="7" height="7" viewBox="0 0 7 7">
            <line x1="1.5" y1="1.5" x2="5.5" y2="5.5" stroke="rgba(0,0,0,0.5)" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="5.5" y1="1.5" x2="1.5" y2="5.5" stroke="rgba(0,0,0,0.5)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

/** Windows/Linux — single close button (hides window to background) */
function WinCloseButton() {
  return (
    <div className="pe-1 no-drag">
      <button
        onClick={() => hideWindow()}
        className="w-7 h-6 flex items-center justify-center hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors cursor-pointer rounded-sm group"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-foreground/40 group-hover:text-red-500">
          <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function WindowHeader() {
  return (
    <div
      data-tauri-drag-region
      className="h-7 flex items-center cursor-move drag-region shrink-0"
    >
      {/* macOS: red close dot on the left */}
      {isMac && <MacCloseButton />}

      {/* Draggable spacer */}
      <div className="flex-1" />

      {/* Windows/Linux: close button on the right */}
      {!isMac && <WinCloseButton />}
    </div>
  );
}
