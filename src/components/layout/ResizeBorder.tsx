import { getCurrentWindow } from '@tauri-apps/api/window';

type ResizeDirection =
  | 'North' | 'South' | 'East' | 'West'
  | 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest';

interface ResizeEdgeProps {
  direction: ResizeDirection;
  className: string;
}

function ResizeEdge({ direction, className }: ResizeEdgeProps) {
  const handleMouseDown = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const window = getCurrentWindow();
      await window.startResizeDragging(direction);
    } catch {
      // Resize start failed
    }
  };

  return (
    <div
      className={className}
      onMouseDown={handleMouseDown}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    />
  );
}

export function ResizeBorder() {
  return (
    <>
      {/* Edges - 6px hit area */}
      <ResizeEdge
        direction="North"
        className="fixed top-0 left-4 right-4 h-[6px] cursor-ns-resize z-[9999]"
      />
      <ResizeEdge
        direction="South"
        className="fixed bottom-0 left-4 right-4 h-[6px] cursor-ns-resize z-[9999]"
      />
      <ResizeEdge
        direction="West"
        className="fixed left-0 top-4 bottom-4 w-[6px] cursor-ew-resize z-[9999]"
      />
      <ResizeEdge
        direction="East"
        className="fixed right-0 top-4 bottom-4 w-[6px] cursor-ew-resize z-[9999]"
      />

      {/* Corners - 16px hit area */}
      <ResizeEdge
        direction="NorthWest"
        className="fixed top-0 left-0 w-4 h-4 cursor-nwse-resize z-[10000]"
      />
      <ResizeEdge
        direction="NorthEast"
        className="fixed top-0 right-0 w-4 h-4 cursor-nesw-resize z-[10000]"
      />
      <ResizeEdge
        direction="SouthWest"
        className="fixed bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-[10000]"
      />
      <ResizeEdge
        direction="SouthEast"
        className="fixed bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-[10000]"
      />
    </>
  );
}
