import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { MoreVertical, Pin, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FormatIcon } from './FormatIcon';
import { ItemMenu } from './ItemMenu';
import { HighlightedText } from '@/components/ui/HighlightedText';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64, writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { hideWriteAndPaste, hideAndSimulatePaste } from '@/lib/window';
import { parseImageData } from '@/lib/imageUtils';
import { useAppStore } from '@/stores/appStore';
import { usePreviewStore } from '@/stores/previewStore';
import { cn } from '@/lib/utils';
import type { ClipboardItem, DetectedFormat } from '@/types/clipboard';

// Short labels for format badges — only show for notable formats
const FORMAT_BADGE: Partial<Record<DetectedFormat, string>> = {
  json: 'JSON', jwt: 'JWT', base64: 'B64', sql: 'SQL', yaml: 'YAML',
  csv: 'CSV', xml: 'XML', regex: 'RegEx', hex: 'Hex', markdown: 'MD',
  code_js: 'JS', code_ts: 'TS', code_python: 'PY', code_go: 'Go',
  code_rust: 'RS', code_java: 'Java', code_csharp: 'C#',
};

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
  const [showFlash, setShowFlash] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDiffMode = useAppStore((state) => state.isDiffMode);
  const addToDiffSelection = useAppStore((state) => state.addToDiffSelection);
  const diffSelectedIds = useAppStore((state) => state.diffSelectedIds);
  const openMenuItemId = useAppStore((state) => state.openMenuItemId);
  const setOpenMenuItemId = useAppStore((state) => state.setOpenMenuItemId);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const isSelectedForDiff = diffSelectedIds.includes(item.id);
  const { openView } = usePreviewStore();

  const isMenuOpen = openMenuItemId === item.id;

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
      setIsPasting(true);
      try {
        await writeImageBase64(imageData.base64);
        await hideAndSimulatePaste();
      } finally {
        setIsPasting(false);
      }
    } else if (item.htmlContent) {
      setShowFlash(true);
      await hideWriteAndPaste(async () => {
        await writeHtmlAndText(item.htmlContent!, item.content);
      });
    } else {
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
    };
  }, []);

  const openMenu = useCallback(() => {
    // Cancel any pending close
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
    setOpenMenuItemId(item.id);
  }, [item.id, setOpenMenuItemId]);

  const scheduleCloseMenu = useCallback(() => {
    // Small delay so mouse can travel from button to menu without closing
    menuCloseTimer.current = setTimeout(() => {
      // Only close if this item's menu is still the open one
      if (useAppStore.getState().openMenuItemId === item.id) {
        setOpenMenuItemId(null);
      }
    }, 150);
  }, [item.id, setOpenMenuItemId]);

  const cancelCloseMenu = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
  }, []);

  const handleMenuClose = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
    setOpenMenuItemId(null);
  }, [setOpenMenuItemId]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu();
  }, [openMenu]);

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 h-8 px-2.5 rounded-md cursor-pointer transition-colors',
        'active:scale-[0.98] active:transition-transform',
        isHovered || isMenuOpen ? 'bg-surface-hover' : 'bg-transparent',
        isDiffMode && 'cursor-crosshair',
        isSelectedForDiff && 'ring-2 ring-accent',
        isSelected && !isDiffMode && 'bg-accent/20 ring-1 ring-accent',
        showFlash && 'copy-flash'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
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
      {item.htmlContent && (
        <span className="text-[8px] font-medium text-orange-400 bg-orange-400/10 px-1 rounded shrink-0">
          HTML
        </span>
      )}
      {FORMAT_BADGE[item.detectedFormat] && (
        <span className="text-[8px] font-medium text-accent bg-accent/10 px-1 rounded shrink-0">
          {FORMAT_BADGE[item.detectedFormat]}
        </span>
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
        <span className="flex-1 min-w-0 truncate text-xs flex items-center gap-1.5">
          {item.detectedFormat === 'color' && (
            <span
              className="inline-block w-3 h-3 rounded-sm border border-border/50 shrink-0"
              style={{ backgroundColor: item.content.trim() }}
            />
          )}
          <HighlightedText text={item.content} query={searchQuery} className="truncate" />
        </span>
      )}
      {item.sourceApp && !isHovered && !isMenuOpen && (
        <span className="text-[9px] text-muted-foreground/60 shrink-0 max-w-[50px] truncate">{item.sourceApp}</span>
      )}
      <span className="text-[10px] text-muted-foreground shrink-0 w-7 text-right">{formatRelativeTime(item.createdAt)}</span>
      {!isDiffMode && (
        <div className={cn('flex items-center gap-0.5', (isHovered || isMenuOpen) ? 'opacity-100' : 'opacity-0')}>
          <button
            className="p-0.5 rounded hover:bg-surface transition-colors shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={handleQuickView}
            title="Quick View"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            ref={menuButtonRef}
            className="p-0.5 rounded hover:bg-surface transition-colors shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
            onClick={(e) => e.stopPropagation()}
            title="Actions (right-click)"
          >
            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      <ItemMenu
        item={item}
        isOpen={isMenuOpen && !isDiffMode}
        onClose={handleMenuClose}
        onMouseEnter={cancelCloseMenu}
        onMouseLeave={scheduleCloseMenu}
        anchorRef={menuButtonRef}
      />
    </div>
  );
}
