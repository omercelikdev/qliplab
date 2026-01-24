import { useState, useRef, useCallback, useMemo } from 'react';
import { MoreVertical, Pin, Eye, Image as ImageIcon } from 'lucide-react';
import { FormatIcon } from './FormatIcon';
import { ItemMenu } from './ItemMenu';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64 } from 'tauri-plugin-clipboard-api';
import { hideAndPaste } from '@/lib/window';
import { useAppStore } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { cn } from '@/lib/utils';
import type { ClipboardItem } from '@/types/clipboard';

// Cache for parsed image data to avoid re-parsing on every render
const imageCache = new Map<string, { dataUrl: string; base64: string } | null>();

// Parse image data and create a displayable URL (with caching)
function parseImageData(content: string): { dataUrl: string; base64: string } | null {
  // Check cache first
  if (imageCache.has(content)) {
    return imageCache.get(content) || null;
  }

  try {
    const data = JSON.parse(content);

    // New format: PNG base64 from CrossCopy plugin
    if (data.type === 'png_base64' && data.data) {
      const result = {
        dataUrl: `data:image/png;base64,${data.data}`,
        base64: data.data
      };
      imageCache.set(content, result);
      return result;
    }

    // Legacy format: RGBA data - convert to PNG
    if (data.type === 'rgba' && data.data && data.width && data.height) {
      const binary = atob(data.data);
      const rgba = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        rgba[i] = binary.charCodeAt(i);
      }

      const canvas = document.createElement('canvas');
      canvas.width = data.width;
      canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        imageCache.set(content, null);
        return null;
      }

      const imageData = ctx.createImageData(data.width, data.height);
      imageData.data.set(rgba);
      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];

      const result = { dataUrl, base64 };
      imageCache.set(content, result);
      return result;
    }
  } catch {
    // Not a valid image data
  }

  imageCache.set(content, null);
  return null;
}

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
}

export function HistoryItem({ item, isSelected = false }: HistoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuButtonHovered, setIsMenuButtonHovered] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleClick = async () => {
    if (isMenuOpen) return;

    if (isDiffMode) {
      addToDiffSelection(item.id);
    } else {
      if (item.contentType === 'image' && imageData) {
        // Write image to clipboard using CrossCopy plugin
        try {
          await writeImageBase64(imageData.base64);
        } catch (e) {
          console.error('Failed to write image:', e);
        }
      } else {
        await writeText(item.content);
      }
      await hideAndPaste();
    }
  };

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
      className={cn(
        'relative flex items-center gap-2 h-8 px-2.5 rounded-md cursor-pointer transition-colors',
        'active:scale-[0.98] active:transition-transform',
        isHovered || isMenuOpen ? 'bg-surface-hover' : 'bg-transparent',
        isDiffMode && 'cursor-crosshair',
        isSelectedForDiff && 'ring-2 ring-accent',
        isSelected && !isDiffMode && 'bg-accent/20 ring-1 ring-accent'
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
        <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      ) : (
        <FormatIcon format={item.detectedFormat} />
      )}
      {item.isPinned && <Pin className="w-3 h-3 text-accent shrink-0" />}
      {item.contentType === 'image' && imageData ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src={imageData.dataUrl}
            alt="Clipboard image"
            className="h-5 w-auto max-w-[60px] rounded object-cover"
          />
          <span className="text-xs text-muted-foreground truncate">
            Image
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
