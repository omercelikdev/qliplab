import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MoreVertical, Pin, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FormatIcon } from './FormatIcon';
import { ItemMenu } from './ItemMenu';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64 } from 'tauri-plugin-clipboard-api';
import { hideWriteAndPaste, hideAndSimulatePaste } from '@/lib/window';
import { parseImageData } from '@/lib/imageUtils';
import { useAppStore } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { cn } from '@/lib/utils';
import type { ClipboardItem } from '@/types/clipboard';

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}

interface HistoryItemProps {
  item: ClipboardItem;
  isSelected?: boolean;
  isPastingFromKeyboard?: boolean;
}

export function HistoryItem({ item, isSelected = false, isPastingFromKeyboard = false }: HistoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuButtonHovered, setIsMenuButtonHovered] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const isDiffMode = useAppStore((state) => state.isDiffMode);
  const addToDiffSelection = useAppStore((state) => state.addToDiffSelection);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const isSelectedForDiff = diffSelectedIds.includes(item.id);
  const { openView } = usePreviewStore();

  // Parse image data if this is an image item
  const imageData = useMemo(() => {
    if (item.contentType === 'image') {
      return parseImageData(item.content);
    }
    return null;
  }, [item.content, item.contentType]);

  const handleQuickView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    openView(item);
  }, [item, openView]);

  // Combined pasting state from click or keyboard
  const isCurrentlyPasting = isPasting || isPastingFromKeyboard;

  const handleClick = async () => {
    if (isMenuOpen || isCurrentlyPasting) return;

    if (isDiffMode) {
      addToDiffSelection(item.id);
    } else if (item.contentType === 'image' && imageData) {
      // For images: show loading, write to clipboard, then hide and paste
      setIsPasting(true);
      try {
        // Write image to clipboard while showing loading
        await writeImageBase64(imageData.base64);
        // Then hide and paste
        await hideAndSimulatePaste();
      } finally {
        setIsPasting(false);
      }
    } else {
      // For text: fast path - hide immediately
      setShowFlash(true);
      await hideWriteAndPaste(async () => {
        await writeText(item.content);
      });
    }
  };

  // Reset flash effect after animation
  useEffect(() => {
    if (showFlash) {
      const timer = setTimeout(() => setShowFlash(false), 400);
      return () => clearTimeout(timer);
    }
  }, [showFlash]);

  const handleMenuButtonEnter = () => {
    setIsMenuButtonHovered(true);
    setIsMenuOpen(true);
  };

  const handleMenuButtonLeave = () => {
    setIsMenuButtonHovered(false);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
    setIsMenuButtonHovered(false);
  };

  return (
    <div
      ref={itemRef}
      className={cn(
        'relative flex items-center gap-2 h-8 px-1.5 rounded-md cursor-pointer transition-colors',
        'active:scale-[0.98] active:transition-transform',
        isHovered || isMenuOpen ? 'bg-surface-hover' : 'bg-transparent',
        isDiffMode && 'cursor-crosshair',
        isSelectedForDiff && 'ring-2 ring-accent',
        isSelected && !isDiffMode && 'bg-accent/20 ring-1 ring-accent',
        showFlash && 'copy-flash'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isMenuButtonHovered) {
          setIsMenuOpen(false);
        }
      }}
      onClick={handleClick}
    >
      {item.contentType === 'image' ? (
        isCurrentlyPasting ? (
          <Loader2 className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-spin" />
        ) : (
          <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        )
      ) : (
        <FormatIcon format={item.detectedFormat} />
      )}
      {item.isPinned && <Pin className="w-3 h-3 text-accent shrink-0" />}
      {item.contentType === 'image' && imageData ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src={imageData.dataUrl}
            alt="Clipboard image"
            className={cn(
              "h-5 w-auto max-w-[60px] rounded object-cover transition-opacity",
              isCurrentlyPasting && "opacity-50"
            )}
          />
          <span className="text-xs text-muted-foreground truncate">
            {isCurrentlyPasting ? 'Pasting...' : 'Image'}
          </span>
        </div>
      ) : (
        <span className="flex-1 min-w-0 truncate text-xs">{item.content}</span>
      )}
      <span className="text-[10px] text-muted-foreground shrink-0 w-7 text-right">{formatRelativeTime(item.createdAt)}</span>
      {!isDiffMode && (
        <div className={cn('flex items-center gap-0.5', (isHovered || isMenuOpen) ? 'opacity-100' : 'opacity-0')}>
          {/* Quick View Button */}
          <button
            className="p-0.5 rounded hover:bg-surface transition-colors shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={handleQuickView}
            title="Quick View"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {/* Menu Button */}
          <button
            ref={menuButtonRef}
            className="p-0.5 rounded hover:bg-surface transition-colors shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
            onMouseEnter={handleMenuButtonEnter}
            onMouseLeave={handleMenuButtonLeave}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      <ItemMenu
        item={item}
        isOpen={isMenuOpen && !isDiffMode}
        onClose={handleMenuClose}
        anchorRef={menuButtonRef}
      />
    </div>
  );
}
