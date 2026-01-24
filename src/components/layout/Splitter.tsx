import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SplitterProps {
  onResize: (listWidth: number) => void;
  minListWidth?: number;
  maxListWidth?: number;
}

export function Splitter({
  onResize,
  minListWidth = 200,
  maxListWidth = 500,
}: SplitterProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newWidth = Math.min(maxListWidth, Math.max(minListWidth, e.clientX));
    onResize(newWidth);
  }, [isDragging, minListWidth, maxListWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        'w-1.5 flex-shrink-0 cursor-col-resize group relative',
        'bg-transparent hover:bg-accent/30',
        isDragging && 'bg-accent/50'
      )}
    >
      {/* Visible line */}
      <div
        className={cn(
          'absolute inset-y-0 left-1/2 -translate-x-1/2 w-px',
          'bg-border/50 group-hover:bg-accent/70',
          isDragging && 'bg-accent'
        )}
      />
    </div>
  );
}
