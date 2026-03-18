import { useState, useLayoutEffect, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Pin, PinOff, Sparkles, Minimize2, Unlock, Lock, ArrowRightLeft, Info, Palette, Hash, Binary, Pencil, FileText, ClipboardPaste, ScanText, Bot, Tag, Plus, X } from 'lucide-react';
import { usePreviewStore } from '@/stores/previewStore';
import { useHistoryStore } from '@/stores/historyStore';
import * as transforms from '@/lib/transforms';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { writeHtmlAndText } from 'tauri-plugin-clipboard-api';
import { invoke } from '@tauri-apps/api/core';
import { hideWriteAndPaste } from '@/lib/window';
import { parseImageData } from '@/lib/imageUtils';
import { useSettingsStore } from '@/stores/settingsStore';
import { isAiConfigured, isAiConsentGiven, runAiAction, AI_ACTIONS } from '@/lib/ai';
import type { AiAction } from '@/lib/ai';
import { AiConsentDialog } from '@/components/settings/AiConsentDialog';
import { useTagStore } from '@/stores/tagStore';
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
  const { openTransform, openView } = usePreviewStore();
  const { deleteItem, togglePin } = useHistoryStore();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [pendingAiAction, setPendingAiAction] = useState<AiAction | null>(null);

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
        openTransform(item, 'OCR Text', text);
      } else {
        openTransform(item, 'OCR Text', '(No text detected)');
      }
    } catch (e) {
      openTransform(item, 'OCR Text', `OCR failed: ${e}`);
    }
    onClose();
  };
  const executeAiAction = async (action: AiAction) => {
    const label = AI_ACTIONS.find(a => a.id === action)?.label ?? action;
    openTransform(item, `AI: ${label}`, 'Processing...');
    try {
      const result = await runAiAction(action, item.content);
      openTransform(item, `AI: ${label}`, result);
    } catch (e) {
      openTransform(item, `AI: Error`, `${e}`);
    }
  };

  const handleAi = (action: AiAction) => {
    onClose();

    if (!isAiConsentGiven()) {
      setPendingAiAction(action);
      setShowAiConsent(true);
      return;
    }

    const provider = useSettingsStore.getState().settings.aiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI';
    const confirmed = window.confirm(
      `Send this content to ${provider} for processing?\n\n` +
      `Do NOT proceed if this contains sensitive data.`
    );
    if (!confirmed) return;

    executeAiAction(action);
  };

  const handleAiConsentAccepted = () => {
    setShowAiConsent(false);
    if (pendingAiAction) {
      executeAiAction(pendingAiAction);
      setPendingAiAction(null);
    }
  };
  const handleDelete = () => { deleteItem(item.id); onClose(); };
  const handlePin = () => { togglePin(item.id); onClose(); };

  const aiAvailable = isAiConfigured() && item.contentType === 'text' && !item.isSensitive;

  const getTransformItems = () => {
    switch (item.detectedFormat) {
      case 'json':
        return [
          { icon: Sparkles, label: 'Beautify', action: () => openTransform(item, 'Beautify JSON', transforms.beautifyJson(item.content)) },
          { icon: Minimize2, label: 'Minify', action: () => openTransform(item, 'Minify JSON', transforms.minifyJson(item.content)) },
          { icon: ArrowRightLeft, label: 'To YAML', action: () => openTransform(item, 'JSON → YAML', transforms.jsonToYaml(item.content)) },
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
      case 'yaml':
        return [
          { icon: Sparkles, label: 'Beautify', action: () => openTransform(item, 'Beautify YAML', transforms.beautifyYaml(item.content)) },
          { icon: ArrowRightLeft, label: 'To JSON', action: () => openTransform(item, 'YAML → JSON', transforms.yamlToJson(item.content)) },
          { icon: Info, label: 'Validate', action: () => {
            const result = transforms.validateYaml(item.content);
            openTransform(item, 'Validate YAML', result.valid ? '✓ Valid YAML' : `✗ Invalid: ${result.error}`);
          }},
        ];
      case 'color':
        return [
          { icon: Palette, label: 'To HEX', action: () => openTransform(item, 'Color → HEX', transforms.colorToHex(item.content)) },
          { icon: Palette, label: 'To RGB', action: () => openTransform(item, 'Color → RGB', transforms.colorToRgb(item.content)) },
          { icon: Palette, label: 'To HSL', action: () => openTransform(item, 'Color → HSL', transforms.colorToHsl(item.content)) },
          { icon: Info, label: 'Color Info', action: () => openTransform(item, 'Color Info', transforms.colorInfo(item.content)) },
        ];
      case 'csv':
        return [
          { icon: ArrowRightLeft, label: 'To JSON', action: () => openTransform(item, 'CSV → JSON', transforms.csvToJson(item.content)) },
          { icon: Info, label: 'CSV Info', action: () => openTransform(item, 'CSV Info', transforms.csvInfo(item.content)) },
        ];
      case 'regex':
        return [
          { icon: Info, label: 'Regex Info', action: () => openTransform(item, 'Regex Info', transforms.regexInfo(item.content)) },
          { icon: Lock, label: 'Escape', action: () => openTransform(item, 'Escape Regex', transforms.escapeRegex(item.content)) },
        ];
      case 'hex':
        return [
          { icon: Hash, label: 'To Text', action: () => openTransform(item, 'Hex → Text', transforms.hexToText(item.content)) },
          { icon: Binary, label: 'To Decimal', action: () => openTransform(item, 'Hex → Decimal', transforms.hexToDecimal(item.content)) },
          { icon: Binary, label: 'To Binary', action: () => openTransform(item, 'Hex → Binary', transforms.hexToBinary(item.content)) },
        ];
      case 'code_js':
        return [
          { icon: Sparkles, label: 'Beautify', action: async () => {
            const formatted = await transforms.beautifyJavaScript(item.content);
            openTransform(item, 'Beautify JavaScript', formatted);
          }},
        ];
      case 'code_ts':
        return [
          { icon: Sparkles, label: 'Beautify', action: async () => {
            const formatted = await transforms.beautifyTypeScript(item.content);
            openTransform(item, 'Beautify TypeScript', formatted);
          }},
        ];
      default:
        return [];
    }
  };

  const transformItems = getTransformItems();

  const aiProvider = useSettingsStore.getState().settings.aiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI';

  if (!isOpen && !showAiConsent) return null;

  return (
    <>
    {showAiConsent && (
      <AiConsentDialog
        isOpen={showAiConsent}
        onClose={() => { setShowAiConsent(false); setPendingAiAction(null); }}
        onAccept={handleAiConsentAccepted}
        provider={aiProvider as 'Anthropic' | 'OpenAI'}
      />
    )}
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
            className="w-36 py-1 rounded-lg bg-surface border border-border shadow-lg"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <MenuButton icon={Copy} label="Copy" onClick={handleCopy} />
            {item.htmlContent && (
              <>
                <MenuButton icon={FileText} label="Copy HTML" onClick={handleCopyHtml} />
                <MenuButton icon={ClipboardPaste} label="Paste Plain" onClick={handlePastePlainText} />
              </>
            )}
            <MenuButton icon={Pencil} label="Edit" onClick={() => { openView(item); onClose(); }} />

            {item.contentType === 'image' && (
              <>
                <div className="h-px bg-border my-1" />
                <MenuButton icon={ScanText} label="Extract Text" onClick={handleOcr} />
              </>
            )}

            {transformItems.length > 0 && <div className="h-px bg-border my-1" />}
            {transformItems.map((transformItem, i) => (
              <MenuButton key={i} icon={transformItem.icon} label={transformItem.label} onClick={() => { transformItem.action(); onClose(); }} />
            ))}

            {aiAvailable && (
              <>
                <div className="h-px bg-border my-1" />
                {AI_ACTIONS.map((action) => (
                  <MenuButton key={action.id} icon={Bot} label={action.label} onClick={() => handleAi(action.id)} />
                ))}
              </>
            )}

            <div className="h-px bg-border my-1" />
            <TagSubmenu itemId={item.id} />
            <div className="h-px bg-border my-1" />
            <MenuButton icon={item.isPinned ? PinOff : Pin} label={item.isPinned ? 'Unpin' : 'Pin'} onClick={handlePin} />
            <MenuButton icon={Trash2} label="Delete" onClick={handleDelete} destructive />
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
      className={cn('w-full flex items-center gap-1.5 px-2.5 py-1 text-xs text-left hover:bg-surface-hover transition-colors cursor-pointer', destructive && 'text-destructive')}
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

const TAG_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

function TagSubmenu({ itemId }: { itemId: string }) {
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
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
      </div>
      {/* Existing tags — toggle on/off, delete on trash icon */}
      {tags.map(tag => {
        const isApplied = itemTagIds.has(tag.id);
        return (
          <div key={tag.id} className="group/tag flex items-center">
            <button
              className="flex-1 flex items-center gap-1.5 px-1 py-0.5 text-[11px] hover:bg-surface-hover rounded transition-colors cursor-pointer min-w-0"
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
              <span className="truncate flex-1 text-left">{tag.name}</span>
              {isApplied && <X className="w-3 h-3 text-muted-foreground shrink-0" />}
            </button>
            <button
              className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/tag:opacity-100 transition-opacity cursor-pointer shrink-0"
              onClick={(e) => handleDeleteTag(e, tag.id)}
              title="Delete tag from all items"
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
            placeholder="Tag name..."
            className="flex-1 px-1.5 py-0.5 text-[10px] bg-surface border border-border rounded outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      ) : (
        <button
          className="w-full flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded transition-colors cursor-pointer mt-0.5"
          onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
        >
          <Plus className="w-3 h-3" />
          New tag
        </button>
      )}
    </div>
  );
}
