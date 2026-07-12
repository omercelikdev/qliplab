import { useState, useLayoutEffect, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Pin, PinOff, Sparkles, Minimize2, Unlock, Lock, ArrowRightLeft, Info, Palette, Hash, Binary, Pencil, FileText, ClipboardPaste, ScanText, Tag, Plus, X } from 'lucide-react';
import { usePreviewStore } from '@/stores/previewStore';
import { useHistoryStore } from '@/stores/historyStore';
import * as transforms from '@/lib/transforms';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { invoke } from '@tauri-apps/api/core';
import { hideWriteAndPaste } from '@/lib/window';
import { parseImageData } from '@/lib/imageUtils';
import { useTagStore } from '@/stores/tagStore';
import { isLinux } from '@/lib/platform';
import { cn } from '@/lib/utils';
import type { ClipboardItem } from '@/types/clipboard';

interface ItemMenuProps {
  item: ClipboardItem;
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export function ItemMenu({ item, isOpen, onClose, onMouseEnter, onMouseLeave, anchorRef }: ItemMenuProps) {
  const { t } = useTranslation();
  const { openTransform, openView } = usePreviewStore();
  const { deleteItem, togglePin } = useHistoryStore();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isOpen && anchorRef.current) {
      const button = anchorRef.current;
      const rect = button.getBoundingClientRect();

      const menuEl = menuRef.current;
      const menuHeight = menuEl?.offsetHeight || 180;
      const menuWidth = menuEl?.offsetWidth || 144;

      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // Menu's right edge aligns with button's right edge — stable anchor
      let left = rect.right - menuWidth;
      if (left < 4) left = 4;
      if (left + menuWidth > windowWidth - 4) left = windowWidth - menuWidth - 4;

      let top: number;
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow >= menuHeight + 4) {
        top = rect.bottom + 2;
      } else if (spaceAbove >= menuHeight + 4) {
        top = rect.top - menuHeight - 2;
      } else {
        top = Math.max(4, Math.min(windowHeight - menuHeight - 4, rect.bottom + 2));
      }

      setPosition({ top, left });
    }
  }, [isOpen, anchorRef]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = async () => { await writeText(item.content); onClose(); };
  const handleCopyHtml = async () => {
    if (item.htmlContent) {
      await writeHtmlAndText(item.htmlContent, item.content);
    }
    onClose();
  };
  const handlePastePlainText = async () => {
    onClose();
    await hideWriteAndPaste(async () => {
      await writeText(item.content);
    });
  };
  const handleOcr = async () => {
    if (item.contentType !== 'image') return;
    const imgData = parseImageData(item.content);
    if (!imgData) return;
    try {
      const text = await invoke<string>('ocr_image', { base64Data: imgData.base64 });
      if (text) {
        openTransform(item, t('history.ocrTitle'), text);
      } else {
        openTransform(item, t('history.ocrTitle'), t('history.ocrNoText'));
      }
    } catch (e) {
      openTransform(item, t('history.ocrTitle'), t('history.ocrFailed', { error: e }));
    }
    onClose();
  };
  const handleDelete = () => { deleteItem(item.id); onClose(); };
  const handlePin = () => { togglePin(item.id); onClose(); };

  const ocrAvailable = !isLinux();
  const htmlPasteAvailable = true;

  const getTransformItems = () => {
    switch (item.detectedFormat) {
      case 'json':
        return [
          { icon: Sparkles, label: t('history.transform.beautify'), action: () => openTransform(item, 'Beautify JSON', transforms.beautifyJson(item.content)) },
          { icon: Minimize2, label: t('history.transform.minify'), action: () => openTransform(item, 'Minify JSON', transforms.minifyJson(item.content)) },
          { icon: ArrowRightLeft, label: t('history.transform.toYaml'), action: () => openTransform(item, 'JSON → YAML', transforms.jsonToYaml(item.content)) },
        ];
      case 'jwt':
        return [
          { icon: Unlock, label: t('history.transform.decode'), action: () => {
            const decoded = transforms.decodeJwt(item.content);
            openTransform(item, 'Decode JWT', decoded ? JSON.stringify(decoded, null, 2) : 'Invalid JWT');
          }},
        ];
      case 'base64':
        return [
          { icon: Unlock, label: t('history.transform.decode'), action: () => openTransform(item, 'Decode Base64', transforms.decodeBase64(item.content)) },
          { icon: Lock, label: t('history.transform.encode'), action: () => openTransform(item, 'Encode Base64', transforms.encodeBase64(item.content)) },
        ];
      case 'url':
        return [
          { icon: Unlock, label: t('history.transform.decode'), action: () => openTransform(item, 'Decode URL', transforms.decodeUrl(item.content)) },
        ];
      case 'url_encoded':
        return [
          { icon: Unlock, label: t('history.transform.decode'), action: () => openTransform(item, 'Decode URL', transforms.decodeUrl(item.content)) },
        ];
      case 'sql':
        return [
          { icon: Sparkles, label: t('history.transform.format'), action: () => openTransform(item, 'Format SQL', transforms.formatSql(item.content)) },
        ];
      case 'timestamp':
        return [
          { icon: Sparkles, label: t('history.transform.toDate'), action: () => openTransform(item, 'Timestamp to Date', transforms.timestampToDate(item.content)) },
        ];
      case 'yaml':
        return [
          { icon: Sparkles, label: t('history.transform.beautify'), action: () => openTransform(item, 'Beautify YAML', transforms.beautifyYaml(item.content)) },
          { icon: ArrowRightLeft, label: t('history.transform.toJson'), action: () => openTransform(item, 'YAML → JSON', transforms.yamlToJson(item.content)) },
          { icon: Info, label: t('history.transform.validate'), action: () => {
            const result = transforms.validateYaml(item.content);
            openTransform(item, 'Validate YAML', result.valid ? '✓ Valid YAML' : `✗ Invalid: ${result.error}`);
          }},
        ];
      case 'color':
        return [
          { icon: Palette, label: t('history.transform.toHex'), action: () => openTransform(item, 'Color → HEX', transforms.colorToHex(item.content)) },
          { icon: Palette, label: t('history.transform.toRgb'), action: () => openTransform(item, 'Color → RGB', transforms.colorToRgb(item.content)) },
          { icon: Palette, label: t('history.transform.toHsl'), action: () => openTransform(item, 'Color → HSL', transforms.colorToHsl(item.content)) },
          { icon: Info, label: t('history.transform.colorInfo'), action: () => openTransform(item, 'Color Info', transforms.colorInfo(item.content)) },
        ];
      case 'csv':
        return [
          { icon: ArrowRightLeft, label: t('history.transform.toJson'), action: () => openTransform(item, 'CSV → JSON', transforms.csvToJson(item.content)) },
          { icon: Info, label: t('history.transform.csvInfo'), action: () => openTransform(item, 'CSV Info', transforms.csvInfo(item.content)) },
        ];
      case 'regex':
        return [
          { icon: Info, label: t('history.transform.regexInfo'), action: () => openTransform(item, 'Regex Info', transforms.regexInfo(item.content)) },
          { icon: Lock, label: t('history.transform.escape'), action: () => openTransform(item, 'Escape Regex', transforms.escapeRegex(item.content)) },
        ];
      case 'hex':
        return [
          { icon: Hash, label: t('history.transform.toText'), action: () => openTransform(item, 'Hex → Text', transforms.hexToText(item.content)) },
          { icon: Binary, label: t('history.transform.toDecimal'), action: () => openTransform(item, 'Hex → Decimal', transforms.hexToDecimal(item.content)) },
          { icon: Binary, label: t('history.transform.toBinary'), action: () => openTransform(item, 'Hex → Binary', transforms.hexToBinary(item.content)) },
        ];
      case 'code_js':
        return [
          { icon: Sparkles, label: t('history.transform.beautify'), action: async () => {
            const formatted = await transforms.beautifyJavaScript(item.content);
            openTransform(item, 'Beautify JavaScript', formatted);
          }},
        ];
      case 'code_ts':
        return [
          { icon: Sparkles, label: t('history.transform.beautify'), action: async () => {
            const formatted = await transforms.beautifyTypeScript(item.content);
            openTransform(item, 'Beautify TypeScript', formatted);
          }},
        ];
      default:
        return [];
    }
  };

  const transformItems = getTransformItems();


  if (!isOpen) return null;

  return (
    <>
    {isOpen && createPortal(
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
            className="w-36 p-1 rounded-xl bg-popover border border-popover-border shadow-[0_8px_30px_rgb(0_0_0/0.12)] dark:shadow-[0_8px_30px_rgb(0_0_0/0.5)]"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <MenuButton icon={Copy} label={t('history.menu.copy')} onClick={handleCopy} />
            {item.htmlContent && htmlPasteAvailable && (
              <>
                <MenuButton icon={FileText} label={t('history.menu.copyHtml')} onClick={handleCopyHtml} />
                <MenuButton icon={ClipboardPaste} label={t('history.menu.pastePlain')} onClick={handlePastePlainText} />
              </>
            )}
            <MenuButton icon={Pencil} label={t('history.menu.edit')} onClick={() => { openView(item); onClose(); }} />

            {item.contentType === 'image' && ocrAvailable && (
              <>
                <div className="h-px bg-popover-border/70 my-1" />
                <MenuButton icon={ScanText} label={t('history.menu.extractText')} onClick={handleOcr} />
              </>
            )}

            {transformItems.length > 0 && <div className="h-px bg-popover-border/70 my-1" />}
            {transformItems.map((transformItem, i) => (
              <MenuButton key={i} icon={transformItem.icon} label={transformItem.label} onClick={() => { transformItem.action(); onClose(); }} />
            ))}

            <div className="h-px bg-popover-border/70 my-1" />
            <TagSubmenu itemId={item.id} />
            <div className="h-px bg-popover-border/70 my-1" />
            <MenuButton icon={item.isPinned ? PinOff : Pin} label={item.isPinned ? t('history.menu.unpin') : t('history.menu.pin')} onClick={handlePin} />
            <MenuButton icon={Trash2} label={t('history.menu.delete')} onClick={handleDelete} destructive />
          </motion.div>
        )}
      </AnimatePresence>,
    document.body
  )}
  </>
  );
}

function MenuButton({ icon: Icon, label, onClick, destructive }: { icon: React.ElementType; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      aria-label={label}
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1 text-xs text-start rounded-md transition-colors cursor-pointer',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'hover:bg-foreground/[0.05] dark:hover:bg-white/[0.06]',
      )}
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

const TAG_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

function TagSubmenu({ itemId }: { itemId: string }) {
  const { t } = useTranslation();
  const tags = useTagStore((s) => s.tags);
  const itemTags = useTagStore((s) => s.itemTags);
  const addTagToItem = useTagStore((s) => s.addTagToItem);
  const removeTagFromItem = useTagStore((s) => s.removeTagFromItem);
  const createTag = useTagStore((s) => s.createTag);
  const deleteTag = useTagStore((s) => s.deleteTag);
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const itemTagIds = useMemo(() => new Set(itemTags.get(itemId) || []), [itemTags, itemId]);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleCreateAndAdd = async () => {
    const name = newTagName.trim();
    if (!name) return;
    const color = TAG_COLORS[tags.length % TAG_COLORS.length];
    const tag = await createTag(name, color);
    if (tag) {
      await addTagToItem(itemId, tag.id);
    }
    setNewTagName('');
    setIsAdding(false);
  };

  const handleDeleteTag = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    deleteTag(tagId);
  };

  return (
    <div className="px-2 py-1">
      <div className="flex items-center gap-1 mb-1">
        <Tag className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('history.tags.label')}</span>
      </div>
      {/* Existing tags — toggle on/off, delete on trash icon */}
      {tags.map(tag => {
        const isApplied = itemTagIds.has(tag.id);
        return (
          <div key={tag.id} className="group/tag flex items-center">
            <button
              className="flex-1 flex items-center gap-1.5 px-1 py-0.5 text-[11px] hover:bg-foreground/[0.05] dark:hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                if (isApplied) removeTagFromItem(itemId, tag.id);
                else addTagToItem(itemId, tag.id);
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-foreground/10"
                style={{ backgroundColor: tag.color || '#888' }}
              />
              <span className="truncate flex-1 text-start">{tag.name}</span>
              {isApplied && <X className="w-3 h-3 text-muted-foreground shrink-0" />}
            </button>
            <button
              className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/tag:opacity-100 transition-opacity cursor-pointer shrink-0"
              onClick={(e) => handleDeleteTag(e, tag.id)}
              title={t('history.tags.deleteFromAll')}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
      {/* Add new tag */}
      {isAdding ? (
        <div className="flex items-center gap-1 mt-0.5">
          <input
            ref={inputRef}
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') handleCreateAndAdd();
              if (e.key === 'Escape') { setIsAdding(false); setNewTagName(''); }
            }}
            placeholder={t('history.tags.placeholder')}
            className="flex-1 px-1.5 py-0.5 text-[10px] bg-surface border border-border rounded outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      ) : (
        <button
          className="w-full flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] dark:hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer mt-0.5"
          onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
        >
          <Plus className="w-3 h-3" />
          {t('history.tags.newTag')}
        </button>
      )}
    </div>
  );
}
