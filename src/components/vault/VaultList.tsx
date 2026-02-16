import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, Lock } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { useAppStore } from '@/stores/appStore';
import type { CardData, BankData, AddressData, CodeData } from '@/types/vault';
import { VaultItem } from './VaultItem';
import { VaultLock } from './VaultLock';
import { NewVaultItemDialog } from './NewVaultItemDialog';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideWriteAndPaste } from '@/lib/window';
import { cn } from '@/lib/utils';

export function VaultList() {
  const isLocked = useVaultStore((state) => state.isLocked);
  const items = useVaultStore((state) => state.items);
  const lock = useVaultStore((state) => state.lock);
  const activeTab = useAppStore((state) => state.activeTab);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const getMainValue = (item: typeof items[0]) => {
    switch (item.type) {
      case 'card':
        return (item.data as CardData).cardNumber;
      case 'bank':
        return (item.data as BankData).iban;
      case 'address':
        return (item.data as AddressData).street;
      case 'code':
        return (item.data as CodeData).code;
      default:
        return JSON.stringify(item.data);
    }
  };

  // Filter items by search query (title only — content is encrypted)
  const filteredItems = useMemo(
    () => searchQuery
      ? items.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : items,
    [items, searchQuery]
  );

  const handleSelect = useCallback(async (index: number) => {
    const item = filteredItems[index];
    if (item) {
      await hideWriteAndPaste(async () => {
        await writeText(getMainValue(item));
      });
    }
  }, [filteredItems]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: filteredItems.length,
    onSelect: handleSelect,
    isActive: activeTab === 'vault' && !isLocked,
  });

  // Scroll selected item into view
  useEffect(() => {
    const itemEl = itemRefs.current.get(selectedIndex);
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (isLocked) return <VaultLock />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end px-1.5 py-0.5 border-b border-border/50">
        <button
          onClick={lock}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
        >
          <Lock className="w-2.5 h-2.5" /> Lock
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="pl-3 pr-1.5 py-1 space-y-0.5">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(index, el);
                else itemRefs.current.delete(index);
              }}
            >
              <VaultItem item={item} isSelected={index === selectedIndex} />
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No vault items. Add one!
            </div>
          )}
          {filteredItems.length === 0 && items.length > 0 && searchQuery && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No results for "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-1 border-t border-border/50">
        <button
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5 cursor-pointer',
            'text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-md transition-colors'
          )}
        >
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      <NewVaultItemDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </div>
  );
}
