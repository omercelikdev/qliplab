import { useState } from 'react';
import { Eye, EyeOff, Trash2, CreditCard, Building, MapPin, Key } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useVaultStore } from '@/stores/vaultStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { VaultItem as VaultItemType, CardData, BankData, AddressData, CodeData } from '@/types/vault';
import { cn } from '@/lib/utils';

// Type badge config — visual language consistent with HistoryItem badges
const TYPE_BADGE: Record<string, { icon: React.ElementType; label: string; style: string }> = {
  card:    { icon: CreditCard, label: 'Card', style: 'text-blue-400 bg-blue-500/10' },
  bank:    { icon: Building, label: 'Bank', style: 'text-emerald-500 bg-emerald-500/8' },
  address: { icon: MapPin, label: 'Addr', style: 'text-orange-500 bg-orange-500/8' },
  code:    { icon: Key, label: 'Code', style: 'text-red-400 bg-red-500/8' },
};

interface VaultItemProps {
  item: VaultItemType;
  isSelected?: boolean;
}

export function VaultItem({ item, isSelected = false }: VaultItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteItem = useVaultStore((state) => state.deleteItem);

  const badge = TYPE_BADGE[item.type];

  const getMainValue = () => {
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

  const getMaskedPreview = () => {
    const value = getMainValue();
    if (item.type === 'card') return `•••• •••• •••• ${value?.slice(-4) || '****'}`;
    if (item.type === 'bank') return `TR•• •••• •••• ${value?.slice(-4) || '****'}`;
    return '••••••••••';
  };

  const handleCopy = async () => {
    await writeText(getMainValue());
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 h-8 px-2.5 rounded-md cursor-pointer',
        'transition-[background-color] duration-100 ease-out',
        'active:scale-[0.98] active:transition-transform',
        isHovered
          ? 'bg-foreground/[0.03] dark:bg-white/[0.03]'
          : 'bg-transparent',
        isSelected && 'bg-accent/[0.07]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsRevealed(false);
      }}
      onClick={handleCopy}
    >
      {/* Type badge with icon */}
      {badge ? (
        <span className={cn(
          'inline-flex items-center gap-[3px] text-[9px] font-semibold tracking-[0.02em] px-[5px] py-[1px] rounded shrink-0 leading-4',
          badge.style
        )}>
          <badge.icon className="w-2.5 h-2.5" />
          {badge.label}
        </span>
      ) : (
        <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      )}

      {/* Title + masked value */}
      <span className="flex-1 min-w-0 truncate text-xs">
        <span className="font-medium">{item.title}</span>
        <span className="text-foreground/35 ml-1.5 font-mono text-[11px]">
          {isRevealed ? getMainValue() : getMaskedPreview()}
        </span>
      </span>

      {/* Action buttons — fade in/out */}
      <div className={cn(
        'flex items-center gap-0.5 transition-opacity duration-100 ease-out',
        isHovered ? 'opacity-100' : 'opacity-0'
      )}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsRevealed(!isRevealed);
          }}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
        >
          {isRevealed ? (
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center text-destructive cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Vault Item"
        message={`"${item.title}" will be permanently deleted. This cannot be undone.`}
        onConfirm={() => { setShowDeleteConfirm(false); deleteItem(item.id); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
