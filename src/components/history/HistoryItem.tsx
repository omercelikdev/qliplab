import { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MoreVertical, Pencil, Image as ImageIcon, Loader2, GripVertical,
  Code, Braces, Globe, Key, Hash, Clock, Palette, Type,
} from 'lucide-react';
import { ItemMenu } from './ItemMenu';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeImageBase64, writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { startDrag } from '@crabnebula/tauri-plugin-drag';
import { invoke } from '@tauri-apps/api/core';
import { resolveResource } from '@tauri-apps/api/path';
import { hideWriteAndPaste, hideAndSimulatePaste } from '@/lib/window';
import { parseImageData } from '@/lib/imageUtils';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { shouldMaskContent } from '@/lib/sensitiveMask';
import { highlightRanges, tokenizeSearchQuery } from '@/lib/searchQuery';
import { useTagStore } from '@/stores/tagStore';
import type { Tag } from '@/stores/tagStore';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';
import type { ClipboardItem, DetectedFormat } from '@/types/clipboard';

// Stable empty array references to prevent unnecessary re-renders
const EMPTY_TAGS: Tag[] = [];
const EMPTY_TAG_IDS: string[] = [];

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
  if (days > 0) return i18n.t('common.timeDays', { count: days });
  if (hours > 0) return i18n.t('common.timeHours', { count: hours });
  if (minutes > 0) return i18n.t('common.timeMinutes', { count: minutes });
  return i18n.t('common.timeNow');
}

/** Highlight every search token, not just the query taken as one substring. */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const ranges = highlightRanges(text, tokenizeSearchQuery(query));
  if (ranges.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(({ start, end }, i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={i} className="bg-accent/30 text-inherit rounded-sm">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

interface HistoryItemProps {
  item: ClipboardItem;
  isSelected?: boolean;
  isPastingFromKeyboard?: boolean;
  isDiffMode: boolean;
  isSelectedForDiff: boolean;
  isQueueMode: boolean;
  queuePosition: number | null;
  isMenuOpen: boolean;
  searchQuery?: string;
  /** 1-based quick-paste shortcut for this row, or null when it has none. */
  quickPasteNumber?: number | null;
  onOpenMenu: (id: string) => void;
  onCloseMenu: () => void;
  onDiffSelect: (id: string) => void;
  onQueueToggle: (item: ClipboardItem) => void;
  onQuickView: (item: ClipboardItem) => void;
}

export const HistoryItem = memo(function HistoryItem({
  item,
  isSelected = false,
  isPastingFromKeyboard = false,
  isDiffMode,
  isSelectedForDiff,
  isQueueMode,
  queuePosition,
  isMenuOpen,
  searchQuery = '',
  quickPasteNumber = null,
  onOpenMenu,
  onCloseMenu,
  onDiffSelect,
  onQueueToggle,
  onQuickView,
}: HistoryItemProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  // Keep secrets out of shoulder-surfing range until the row is hovered.
  const sensitiveDetectionEnabled = useSettingsStore((s) => s.settings.sensitiveDetectionEnabled);
  const isMasked = shouldMaskContent(item.isSensitive, sensitiveDetectionEnabled, isHovered);

  const handleClick = async () => {
    if (isMenuOpen || isCurrentlyPasting) return;

    if (isQueueMode) {
      onQueueToggle(item);
      return;
    }

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

  const handleDragStart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    try {
      const isMac = navigator.platform.includes('Mac');
      const textType = isMac ? 'public.utf8-plain-text' : 'text/plain';
      const htmlType = isMac ? 'public.html' : 'text/html';
      const iconPath = await resolveResource('icons/32x32.png');

      if (item.contentType === 'image') {
        // Images: write to temp file and drag as file
        const parsed = parseImageData(item.content);
        if (parsed) {
          const tempPath = await invoke<string>('write_temp_image', { base64Data: parsed.base64 });
          await startDrag({ item: [tempPath], icon: iconPath });
        }
      } else if (item.htmlContent) {
        await startDrag({
          item: {
            data: { [htmlType]: item.htmlContent, [textType]: item.content },
            types: [htmlType, textType],
          },
          icon: iconPath,
        });
      } else {
        await startDrag({
          item: { data: item.content, types: [textType] },
          icon: iconPath,
        });
      }
    } catch {
      // Drag failed
    } finally {
      setIsDragging(false);
    }
  }, [item.content, item.htmlContent, item.contentType]);

  // Badge rendering
  const badgeGroup = FORMAT_GROUP[item.detectedFormat] ?? null;
  const badgeLabel = FORMAT_LABEL[item.detectedFormat];
  const BadgeIcon = badgeGroup ? GROUP_ICON[badgeGroup] : null;
  const standalone = STANDALONE_ICON[item.detectedFormat];
  const isMonospace = MONOSPACE_FORMATS.has(item.detectedFormat);

  // Tags — derive from stable key to prevent re-render loops
  const tagIdKey = useTagStore(useCallback(
    (s) => (s.itemTags.get(item.id) ?? EMPTY_TAG_IDS).join(','),
    [item.id],
  ));
  const itemTags = useMemo(() => {
    if (!tagIdKey) return EMPTY_TAGS;
    const ids = tagIdKey.split(',');
    // Read tags snapshot without subscribing to tags array changes
    return useTagStore.getState().tags.filter(t => ids.includes(t.id));
  }, [tagIdKey]);

  return (
    <div
      // Stable id so the listbox can point aria-activedescendant at the
      // keyboard-selected row; without it a screen reader cannot tell which
      // clip is selected, since focus never leaves the list container.
      id={`clip-${item.id}`}
      role="option"
      aria-selected={isSelected}
      aria-label={item.contentType === 'image' ? t('history.imageClip') : item.content.slice(0, 80)}
      className={cn(
        'relative flex items-center gap-2 h-8 px-2.5 rounded-md cursor-pointer',
        'transition-[background-color] duration-100 ease-out',
        'active:scale-[0.98] active:transition-transform',
        isHovered || isMenuOpen
          ? 'bg-foreground/[0.03] dark:bg-white/[0.03]'
          : 'bg-transparent',
        (isDiffMode || isQueueMode) && 'cursor-crosshair',
        isSelectedForDiff && 'ring-2 ring-accent',
        isQueueMode && queuePosition !== null && 'bg-accent/[0.07]',
        isSelected && !isDiffMode && 'bg-accent/[0.07]',
        showFlash && 'copy-flash',
        isDragging && 'opacity-50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Quick-paste number: nobody uses a shortcut they cannot see. */}
      {quickPasteNumber !== null && (
        <span
          aria-hidden
          className={cn(
            'w-2.5 -ms-1 shrink-0 text-end font-mono text-[9px] tabular-nums leading-none transition-colors duration-100',
            isSelected || isHovered ? 'text-foreground/45' : 'text-foreground/20'
          )}
        >
          {quickPasteNumber}
        </span>
      )}
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
      {isQueueMode && queuePosition !== null && (
        <span className="w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
          {queuePosition}
        </span>
      )}
      {item.contentType === 'image' && imageData ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src={imageData.dataUrl}
            alt={t('history.imageClip')}
            className={cn(
              'h-5 w-auto max-w-[60px] rounded object-cover transition-opacity',
              isCurrentlyPasting && 'opacity-50'
            )}
          />
          <span className="text-xs text-foreground/55 truncate">
            {isCurrentlyPasting ? t('common.pasting') : t('common.image')}
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
          <span
            className={cn(
              'truncate transition-[filter] duration-150',
              isMasked && 'blur-[5px] select-none'
            )}
            title={isMasked ? t('history.sensitiveHidden') : undefined}
          >
            {highlightMatch(item.content.slice(0, 200).replace(/\n/g, ' '), searchQuery)}
          </span>
        </span>
      )}
      {/* Tags */}
      {itemTags.length > 0 && !isHovered && !isMenuOpen && (
        <div className="flex items-center gap-0.5 shrink-0">
          {itemTags.slice(0, 2).map(tag => (
            <span
              key={tag.id}
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: tag.color || '#888' }}
              title={tag.name}
            />
          ))}
          {itemTags.length > 2 && (
            <span className="text-[8px] text-foreground/30">+{itemTags.length - 2}</span>
          )}
        </div>
      )}
      {/* Source app — dimmer than content */}
      {item.sourceApp && !isHovered && !isMenuOpen && (
        <span className="text-[9px] text-foreground/45 shrink-0 max-w-[50px] truncate">{item.sourceApp}</span>
      )}
      {/* Timestamp — dimmest */}
      <span className="text-[10px] text-foreground/45 shrink-0 w-7 text-end">{formatRelativeTime(item.createdAt)}</span>
      {!isDiffMode && !isQueueMode && (
        <div className={cn(
          'flex items-center gap-0.5 transition-opacity duration-100 ease-out',
          (isHovered || isMenuOpen) ? 'opacity-100' : 'opacity-0'
        )}>
          <button
              className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-grab active:cursor-grabbing"
              onMouseDown={handleDragStart}
              onClick={(e) => e.stopPropagation()}
              title={item.contentType === 'image' ? t('history.dragImage') : t('history.dragText')}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          <button
            className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
            onClick={handleQuickView}
            title={t('common.edit')}
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            ref={menuButtonRef}
            className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
            onClick={(e) => e.stopPropagation()}
            title={t('history.actionsTooltip')}
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
