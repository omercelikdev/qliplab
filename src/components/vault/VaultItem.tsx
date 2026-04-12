import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Trash2, Pin, PinOff, Pencil, CreditCard, Building, MapPin, Key, User, Briefcase } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { hideWriteAndPaste } from '@/lib/window';
import { skipNextClipboard } from '@/hooks/useClipboardListener';
import { useVaultStore } from '@/stores/vaultStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { VaultItem as VaultItemType, CardData, BankData, AddressData, PersonalData, CompanyData, CodeData } from '@/types/vault';
import { getVaultFieldMap } from '@/lib/triggerEngine';
import { cn } from '@/lib/utils';

// Type badge config — visual language consistent with HistoryItem badges
const TYPE_BADGE: Record<string, { icon: React.ElementType; label: string; style: string }> = {
  card:    { icon: CreditCard, label: 'Card', style: 'text-blue-400 bg-blue-500/10' },
  bank:    { icon: Building, label: 'Bank', style: 'text-emerald-500 bg-emerald-500/8' },
  address:  { icon: MapPin, label: 'Addr', style: 'text-orange-500 bg-orange-500/8' },
  personal: { icon: User, label: 'Person', style: 'text-purple-500 bg-purple-500/8' },
  company:  { icon: Briefcase, label: 'Corp', style: 'text-cyan-500 bg-cyan-500/8' },
  code:     { icon: Key, label: 'Code', style: 'text-red-400 bg-red-500/8' },
};

interface VaultItemProps {
  item: VaultItemType;
  isSelected?: boolean;
  onEdit?: (item: VaultItemType) => void;
}

export function VaultItem({ item, isSelected = false, onEdit }: VaultItemProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteItem = useVaultStore((state) => state.deleteItem);
  const togglePin = useVaultStore((state) => state.togglePin);

  const badge = TYPE_BADGE[item.type];

  const getMainValue = () => {
    switch (item.type) {
      case 'card':
        return (item.data as CardData).cardNumber;
      case 'bank':
        return (item.data as BankData).iban;
      case 'address': {
        const a = item.data as AddressData;
        return [a.street, a.addressLine2, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(', ');
      }
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

  const getMaskedPreview = () => {
    const value = getMainValue();
    if (item.type === 'card') return `•••• •••• •••• ${value?.slice(-4) || '****'}`;
    if (item.type === 'bank') return `TR•• •••• •••• ${value?.slice(-4) || '****'}`;
    if (item.type === 'personal' || item.type === 'company') return value; // names are not sensitive
    return '••••••••••';
  };

  const handleClick = async () => {
    // Skip clipboard listener to prevent vault content from leaking into history
    skipNextClipboard();
    await hideWriteAndPaste(async () => {
      await writeText(getMainValue());
    });
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
      onClick={handleClick}
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

      {/* Trigger badge with sub-trigger tooltip */}
      {item.trigger && (() => {
        const fields = getVaultFieldMap(item.type);
        const subs = fields.filter(f => f.suffix !== '');
        const tooltip = subs.length > 0
          ? `${item.trigger} + ${subs.map(f => item.trigger + f.suffix).join(', ')}`
          : item.trigger;
        return (
          <span
            className="text-[9px] font-mono font-semibold text-violet-500 bg-violet-500/10 px-[5px] py-[1px] rounded shrink-0 leading-4"
            title={tooltip}
          >
            {item.trigger}
          </span>
        );
      })()}

      {/* Title + masked value */}
      <span className="flex-1 min-w-0 truncate text-xs">
        <span className="font-medium">{item.title}</span>
        <span className="text-foreground/35 ms-1.5 font-mono text-[11px]">
          {isRevealed ? getMainValue() : getMaskedPreview()}
        </span>
      </span>

      {/* Action buttons — fade in/out: Pin/Unpin, Reveal, Edit, Delete */}
      <div className={cn(
        'flex items-center gap-0.5 transition-opacity duration-100 ease-out',
        isHovered ? 'opacity-100' : 'opacity-0'
      )}>
        <button
          onClick={(e) => { e.stopPropagation(); togglePin(item.id); }}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
          title={item.isPinned ? t('common.unpin') : t('common.pin')}
        >
          {item.isPinned
            ? <PinOff className="w-3.5 h-3.5 text-accent" />
            : <Pin className="w-3.5 h-3.5 text-muted-foreground" />
          }
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setIsRevealed(!isRevealed); }}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
          title={isRevealed ? t('vault.hide') : t('vault.reveal')}
        >
          {isRevealed
            ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
            : <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          }
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center cursor-pointer"
          title={t('common.edit')}
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
          className="p-0.5 rounded hover:bg-surface transition-colors duration-100 shrink-0 w-5 h-5 flex items-center justify-center text-destructive cursor-pointer"
          title={t('common.delete')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('vault.deleteTitle')}
        message={t('vault.deleteMessage', { title: item.title })}
        onConfirm={() => { setShowDeleteConfirm(false); deleteItem(item.id); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
