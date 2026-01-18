import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Pin } from 'lucide-react';
import { FormatIcon } from './FormatIcon';
import { ItemMenu } from './ItemMenu';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideAndPaste } from '@/lib/window';
import { useAppStore } from '@/stores/appStore';
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

  const handleClick = async () => {
    if (isMenuOpen) return;

    if (isDiffMode) {
      addToDiffSelection(item.id);
    } else {
      await writeText(item.content);
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
    <motion.div
      className={cn(
        'relative flex items-center gap-2 h-8 px-2.5 rounded-md cursor-pointer transition-colors',
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
      whileTap={{ scale: 0.98 }}
    >
      <FormatIcon format={item.detectedFormat} />
      {item.isPinned && <Pin className="w-3 h-3 text-accent shrink-0" />}
      <span className="flex-1 min-w-0 truncate text-xs">{item.content}</span>
      <span className="text-[10px] text-muted-foreground shrink-0 w-7 text-right">{formatRelativeTime(item.createdAt)}</span>
      {!isDiffMode && (
        <button
          ref={menuButtonRef}
          className={cn(
            'p-0.5 rounded hover:bg-surface transition-colors shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer',
            (isHovered || isMenuOpen) ? 'opacity-100' : 'opacity-0'
          )}
          onMouseEnter={handleMenuButtonEnter}
          onMouseLeave={handleMenuButtonLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
      <ItemMenu
        item={item}
        isOpen={isMenuOpen && !isDiffMode}
        onClose={handleMenuClose}
        anchorRef={menuButtonRef}
      />
    </motion.div>
  );
}
