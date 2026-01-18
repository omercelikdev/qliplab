import { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Pin, PinOff, Sparkles, Minimize2, Unlock, Lock } from 'lucide-react';
import { usePreviewStore } from '@/stores/previewStore';
import { useHistoryStore } from '@/stores/historyStore';
import * as transforms from '@/lib/transforms';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { cn } from '@/lib/utils';
import type { ClipboardItem } from '@/types/clipboard';

interface ItemMenuProps {
  item: ClipboardItem;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export function ItemMenu({ item, isOpen, onClose, anchorRef }: ItemMenuProps) {
  const { openTransform } = usePreviewStore();
  const { deleteItem, togglePin } = useHistoryStore();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isOpen && anchorRef.current) {
      const button = anchorRef.current;
      const rect = button.getBoundingClientRect();

      // Wait for menu to render to get actual height
      requestAnimationFrame(() => {
        const menuEl = menuRef.current;
        const menuHeight = menuEl?.offsetHeight || 180;
        const menuWidth = 160;

        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        // Calculate left position - align to right edge of button
        let left = rect.right - menuWidth;
        if (left < 4) left = 4;
        if (left + menuWidth > windowWidth - 4) left = windowWidth - menuWidth - 4;

        // Calculate top position
        let top: number;
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (spaceBelow >= menuHeight + 4) {
          // Enough space below - show below
          top = rect.bottom + 2;
        } else if (spaceAbove >= menuHeight + 4) {
          // Enough space above - show above
          top = rect.top - menuHeight - 2;
        } else {
          // Not enough space either way - show in the middle, clamped to viewport
          top = Math.max(4, Math.min(windowHeight - menuHeight - 4, rect.bottom + 2));
        }

        setPosition({ top, left });
      });
    }
  }, [isOpen, anchorRef]);

  const handleCopy = async () => { await writeText(item.content); onClose(); };
  const handleDelete = () => { deleteItem(item.id); onClose(); };
  const handlePin = () => { togglePin(item.id); onClose(); };

  const getTransformItems = () => {
    switch (item.detectedFormat) {
      case 'json':
        return [
          { icon: Sparkles, label: 'Beautify', action: () => openTransform(item, 'Beautify JSON', transforms.beautifyJson(item.content)) },
          { icon: Minimize2, label: 'Minify', action: () => openTransform(item, 'Minify JSON', transforms.minifyJson(item.content)) },
        ];
      case 'jwt':
        return [
          { icon: Unlock, label: 'Decode', action: () => {
            const decoded = transforms.decodeJwt(item.content);
            openTransform(item, 'Decode JWT', decoded ? JSON.stringify(decoded, null, 2) : 'Invalid JWT');
          }},
        ];
      case 'base64':
        return [
          { icon: Unlock, label: 'Decode', action: () => openTransform(item, 'Decode Base64', transforms.decodeBase64(item.content)) },
          { icon: Lock, label: 'Encode', action: () => openTransform(item, 'Encode Base64', transforms.encodeBase64(item.content)) },
        ];
      case 'url':
        return [
          { icon: Unlock, label: 'Decode', action: () => openTransform(item, 'Decode URL', transforms.decodeUrl(item.content)) },
        ];
      case 'url_encoded':
        return [
          { icon: Unlock, label: 'Decode', action: () => openTransform(item, 'Decode URL', transforms.decodeUrl(item.content)) },
        ];
      case 'sql':
        return [
          { icon: Sparkles, label: 'Format', action: () => openTransform(item, 'Format SQL', transforms.formatSql(item.content)) },
        ];
      case 'timestamp':
        return [
          { icon: Sparkles, label: 'To Date', action: () => openTransform(item, 'Timestamp to Date', transforms.timestampToDate(item.content)) },
        ];
      default:
        return [];
    }
  };

  const transformItems = getTransformItems();

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 9999,
            maxHeight: 'calc(100vh - 8px)',
            overflowY: 'auto',
          }}
          className="w-40 py-1 rounded-lg bg-background border border-border shadow-xl"
          onMouseLeave={onClose}
        >
          <MenuButton icon={Copy} label="Copy" onClick={handleCopy} />

          {transformItems.length > 0 && <div className="h-px bg-border my-1" />}
          {transformItems.map((transformItem, i) => (
            <MenuButton key={i} icon={transformItem.icon} label={transformItem.label} onClick={() => { transformItem.action(); onClose(); }} />
          ))}

          <div className="h-px bg-border my-1" />
          <MenuButton icon={item.isPinned ? PinOff : Pin} label={item.isPinned ? 'Unpin' : 'Pin'} onClick={handlePin} />
          <MenuButton icon={Trash2} label="Delete" onClick={handleDelete} destructive />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function MenuButton({ icon: Icon, label, onClick, destructive }: { icon: React.ElementType; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-surface-hover transition-colors cursor-pointer', destructive && 'text-destructive')}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
