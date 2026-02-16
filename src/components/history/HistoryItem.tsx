import { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import {
  MoreVertical, Pin, Eye, Image as ImageIcon, Loader2,
  Code, Braces, Globe, Key, Hash, Clock, Palette, Type,
} from 'lucide-react';
import { ItemMenu } from './ItemMenu';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64, writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { hideWriteAndPaste, hideAndSimulatePaste } from '@/lib/window';
import { parseImageData } from '@/lib/imageUtils';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import type { ClipboardItem, DetectedFormat } from '@/types/clipboard';

// Badge config — grouped by category with icon + color
type BadgeGroup = 'code' | 'data' | 'web' | 'security';

const FORMAT_GROUP: Partial<Record<DetectedFormat, BadgeGroup>> = {
  code_js: 'code', code_ts: 'code', code_python: 'code', code_go: 'code',
  code_rust: 'code', code_java: 'code', code_csharp: 'code', sql: 'code', regex: 'code',
  json: 'data', yaml: 'data', csv: 'data', xml: 'data',
  url: 'web', url_encoded: 'web', html: 'web', markdown: 'web',
  jwt: 'security', base64: 'security', hex: 'security',
};

const GROUP_ICON: Record<BadgeGroup, React.ElementType> = {
  code: Code, data: Braces, web: Globe, security: Key,
};

const BADGE_STYLES: Record<BadgeGroup, string> = {
  code:     'text-blue-400 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-400/10',
  data:     'text-emerald-500 bg-emerald-500/8 dark:text-emerald-400 dark:bg-emerald-400/10',
  web:      'text-orange-500 bg-orange-500/8 dark:text-orange-400 dark:bg-orange-400/10',
  security: 'text-red-400 bg-red-500/8 dark:text-red-400 dark:bg-red-400/10',
};

const FORMAT_LABEL: Partial<Record<DetectedFormat, string>> = {
  json: 'JSON', jwt: 'JWT', base64: 'B64', sql: 'SQL', yaml: 'YAML',
  csv: 'CSV', xml: 'XML', regex: 'RegEx', hex: 'Hex', markdown: 'MD',
  code_js: 'JS', code_ts: 'TS', code_python: 'PY', code_go: 'Go',
  code_rust: 'RS', code_java: 'Java', code_csharp: 'C#',
  html: 'HTML', url: 'URL', url_encoded: 'URL',
};

// Standalone icons for types without a badge pill (plain, color, uuid, timestamp)
const STANDALONE_ICON: Partial<Record<DetectedFormat, { icon: React.ElementType; color: string }>> = {
  plain: { icon: Type, color: 'text-muted-foreground' },
  color: { icon: Palette, color: 'text-rose-500' },
  uuid: { icon: Hash, color: 'text-pink-500' },
  timestamp: { icon: Clock, color: 'text-indigo-500' },
};

// Monospace formats — code + data structured formats
const MONOSPACE_FORMATS = new Set<DetectedFormat>([
  'code_js', 'code_ts', 'code_python', 'code_go', 'code_rust', 'code_java', 'code_csharp',
  'sql', 'json', 'yaml', 'csv', 'xml', 'html', 'jwt', 'base64', 'hex', 'regex',
]);

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

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/30 text-inherit rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface HistoryItemProps {
  item: ClipboardItem;
  isSelected?: boolean;
  isPastingFromKeyboard?: boolean;
  isDiffMode: boolean;
  isSelectedForDiff: boolean;
  isMenuOpen: boolean;
  searchQuery?: string;
  onOpenMenu: (id: string) => void;
  onCloseMenu: () => void;
  onDiffSelect: (id: string) => void;
  onQuickView: (item: ClipboardItem) => void;
}

export const HistoryItem = memo(function HistoryItem({
  item,
  isSelected = false,
  isPastingFromKeyboard = false,
  isDiffMode,
  isSelectedForDiff,
  isMenuOpen,
  searchQuery = '',
  onOpenMenu,
  onCloseMenu,
  onDiffSelect,
  onQuickView,
}: HistoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse image data if this is an image item
  const imageData = useMemo(() => {
    if (item.contentType === 'image') {
      return parseImageData(item.content);
    }
    return null;
  }, [item.content, item.contentType]);

  const handleQuickView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView(item);
  }, [item, onQuickView]);

  // Combined pasting state from click or keyboard
  const isCurrentlyPasting = isPasting || isPastingFromKeyboard;

  const handleClick = async () => {
    if (isMenuOpen || isCurrentlyPasting) return;

    if (isDiffMode) {
      onDiffSelect(item.id);
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
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
      menuCloseTimer.current = null;
    }
    onOpenMenu(item.id);
  }, [item.id, onOpenMenu]);

  const scheduleCloseMenu = useCallback(() => {
    menuCloseTimer.current = setTimeout(() => {
      if (useAppStore.getState().openMenuItemId === item.id) {
        onCloseMenu();
      }
    }, 150);
  }, [item.id, onCloseMenu]);

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
    onCloseMenu();
  }, [onCloseMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu();
  }, [openMenu]);

  // Badge rendering
  const badgeGroup = FORMAT_GROUP[item.detectedFormat] ?? null;
  const badgeLabel = FORMAT_LABEL[item.detectedFormat];
  const BadgeIcon = badgeGroup ? GROUP_ICON[badgeGroup] : null;
  const standalone = STANDALONE_ICON[item.detectedFormat];
  const isMonospace = MONOSPACE_FORMATS.has(item.detectedFormat);

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 h-8 px-2.5 rounded-md cursor-pointer',
        'transition-[background-color] duration-100 ease-out',
        'active:scale-[0.98] active:transition-transform',
        isHovered || isMenuOpen
          ? 'bg-foreground/[0.03] dark:bg-white/[0.03]'
          : 'bg-transparent',
        isDiffMode && 'cursor-crosshair',
        isSelectedForDiff && 'ring-2 ring-accent',
        isSelected && !isDiffMode && 'bg-accent/[0.07]',
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
      ) : standalone ? (
        <standalone.icon className={cn('w-3.5 h-3.5 shrink-0', standalone.color)} />
      ) : null}
      {/* Category badge with icon */}
      {badgeLabel && badgeGroup && BadgeIcon && (
        <span className={cn(
          'inline-flex items-center gap-[3px] text-[9px] font-semibold tracking-[0.02em] px-[5px] py-[1px] rounded shrink-0 leading-4',
          BADGE_STYLES[badgeGroup]
        )}>
          <BadgeIcon className="w-2.5 h-2.5" />
          {badgeLabel}
        </span>
      )}
      {/* HTML badge (separate, web group) */}
      {item.htmlContent && !badgeLabel && (
        <span className={cn(
          'inline-flex items-center gap-[3px] text-[9px] font-semibold tracking-[0.02em] px-[5px] py-[1px] rounded shrink-0 leading-4',
          BADGE_STYLES.web
        )}>
          <Globe className="w-2.5 h-2.5" />
          HTML
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
          <span className="text-xs text-foreground/55 truncate">
            {isCurrentlyPasting ? 'Pasting...' : 'Image'}
          </span>
        </div>
      ) : (
        <span className={cn(
          'flex-1 min-w-0 truncate text-xs flex items-center gap-1.5',
          isMonospace && 'font-mono text-[11px]'
        )}>
          {item.detectedFormat === 'color' && (
            <span
              className="inline-block w-3 h-3 rounded-sm border border-border/50 shrink-0"
              style={{ backgroundColor: item.content.trim() }}
            />
          )}
          <span className="truncate">{highlightMatch(item.content.slice(0, 200).replace(/\n/g, ' '), searchQuery)}</span>
        </span>
      )}
      {/* Source app — dimmer than content */}
      {item.sourceApp && !isHovered && !isMenuOpen && (
        <span className="text-[9px] text-foreground/35 shrink-0 max-w-[50px] truncate">{item.sourceApp}</span>
      )}
      {/* Timestamp — dimmest */}
      <span className="text-[10px] text-foreground/25 shrink-0 w-7 text-right">{formatRelativeTime(item.createdAt)}</span>
      {!isDiffMode && (
        <div className={cn(
          'flex items-center gap-0.5 transition-opacity duration-100 ease-out',
          (isHovered || isMenuOpen) ? 'opacity-100' : 'opacity-0'
        )}>
          <button
            className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={handleQuickView}
            title="Quick View"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            ref={menuButtonRef}
            className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
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
});
