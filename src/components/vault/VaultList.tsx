import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Lock, Search } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { useAppStore, VAULT_TYPE_FILTERS } from '@/stores/appStore';
import type { VaultTypeFilter } from '@/stores/appStore';
import type { VaultItem as VaultItemType, CardData, BankData, AddressData, PersonalData, CompanyData, CodeData } from '@/types/vault';
import { VaultItem } from './VaultItem';
import { VaultLock } from './VaultLock';
import { NewVaultItemDialog } from './NewVaultItemDialog';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideWriteAndPaste } from '@/lib/window';
import { skipNextClipboard } from '@/hooks/useClipboardListener';
import { cn } from '@/lib/utils';

export function VaultList() {
  const { t } = useTranslation();
  const isLocked = useVaultStore((state) => state.isLocked);
  const items = useVaultStore((state) => state.items);
  const lock = useVaultStore((state) => state.lock);
  const decryptFailCount = useVaultStore((state) => state.decryptFailCount);
  const activeTab = useAppStore((state) => state.activeTab);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const vaultTypeFilter = useAppStore((state) => state.vaultTypeFilter);
  const setVaultTypeFilter = useAppStore((state) => state.setVaultTypeFilter);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemType | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const getMainValue = (item: typeof items[0]) => {
    switch (item.type) {
      case 'card':
        return (item.data as CardData).cardNumber;
      case 'bank':
        return (item.data as BankData).iban;
      case 'address':
        return (item.data as AddressData).street;
      case 'personal': {
        const d = item.data as PersonalData;
        return [d.firstName, d.lastName].filter(Boolean).join(' ');
      }
      case 'company':
        return (item.data as CompanyData).companyName;
      case 'code':
        return (item.data as CodeData).code;
      default:
        return JSON.stringify(item.data);
    }
  };

  // Filter items by type/favorites + search query (title only — content is encrypted)
  const filteredItems = useMemo(() => {
    let result = items;
    if (vaultTypeFilter === 'favorites') {
      result = result.filter((item) => item.isPinned);
    } else if (vaultTypeFilter !== 'all') {
      result = result.filter((item) => item.type === vaultTypeFilter);
    }
    if (searchQuery) {
      result = result.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    // Pinned first, then by original order
    return [...result].sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));
  }, [items, vaultTypeFilter, searchQuery]);

  const pinnedCount = useMemo(() => filteredItems.filter(i => i.isPinned).length, [filteredItems]);

  const handleEdit = useCallback((item: VaultItemType) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setEditingItem(undefined);
  }, []);

  const handleSelect = useCallback(async (index: number) => {
    const item = filteredItems[index];
    if (item) {
      skipNextClipboard();
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

  // Reset scroll to top when window reopens (matches selectedIndex reset to 0)
  const windowOpenCount = useAppStore((state) => state.windowOpenCount);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [windowOpenCount]);

  // Scroll selected item into view
  useEffect(() => {
    const itemEl = itemRefs.current.get(selectedIndex);
    if (itemEl) {
      itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (isLocked) return <VaultLock />;

  const filterEntries = Object.entries(VAULT_TYPE_FILTERS) as [VaultTypeFilter, string][];

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar + Lock — consistent with HistoryList */}
      <div className="flex items-center gap-1 px-3 py-1.5 shrink-0 overflow-x-auto elevation-bottom">
        {filterEntries.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setVaultTypeFilter(key)}
            className={cn(
              'px-2 py-0.5 text-[10px] rounded-md whitespace-nowrap transition-colors cursor-pointer',
              vaultTypeFilter === key
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-surface-hover'
            )}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={lock}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
        >
          <Lock className="w-2.5 h-2.5" /> {t('vault.lock')}
        </button>
      </div>

      {decryptFailCount > 0 && (
        <div className="mx-3 mt-1 px-2 py-1 text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
          {t('vault.decryptFail', { count: decryptFailCount })}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center max-w-[200px]">
              <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">
                  {items.length === 0 ? t('vault.emptyState.title') : t('common.noResults')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {items.length === 0 ? t('vault.emptyState.description') : t('vault.noResults.description')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="ps-3 pe-1.5 py-1 space-y-0.5">
            {filteredItems.map((item, index) => (
              <div key={item.id}>
                {index === 0 && pinnedCount > 0 && (
                  <div className="flex items-center gap-2 px-1 pt-1 pb-1.5">
                    <span className="text-[9px] uppercase tracking-[0.05em] font-semibold text-foreground/25 shrink-0">{t('common.pinned')}</span>
                    <div className="flex-1 dotted-separator" />
                  </div>
                )}
                {index === pinnedCount && pinnedCount > 0 && (
                  <div className="flex items-center gap-2 px-1 pt-1.5 pb-1.5">
                    <span className="text-[9px] uppercase tracking-[0.05em] font-semibold text-foreground/25 shrink-0">{t('common.recent')}</span>
                    <div className="flex-1 dotted-separator" />
                  </div>
                )}
                <div
                  ref={(el) => {
                    if (el) itemRefs.current.set(index, el);
                    else itemRefs.current.delete(index);
                  }}
                >
                  <VaultItem item={item} isSelected={index === selectedIndex} onEdit={handleEdit} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-1 elevation-top">
        <button
          onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5 cursor-pointer',
            'text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-md transition-colors'
          )}
        >
          <Plus className="w-3.5 h-3.5" /> {t('vault.addItem')}
        </button>
      </div>

      <NewVaultItemDialog isOpen={isDialogOpen} onClose={handleDialogClose} editItem={editingItem} />
    </div>
  );
}
