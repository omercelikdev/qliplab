import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Trash2, CreditCard, Building, MapPin, Key } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useVaultStore } from '@/stores/vaultStore';
import type { VaultItem as VaultItemType } from '@/types/vault';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, typeof CreditCard> = {
  card: CreditCard,
  bank: Building,
  address: MapPin,
  code: Key,
};

interface VaultItemProps {
  item: VaultItemType;
  isSelected?: boolean;
}

export function VaultItem({ item, isSelected = false }: VaultItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const deleteItem = useVaultStore((state) => state.deleteItem);

  const Icon = typeIcons[item.type] || Key;

  const getMainValue = () => {
    switch (item.type) {
      case 'card':
        return item.data.cardNumber;
      case 'bank':
        return item.data.iban;
      case 'address':
        return item.data.street;
      case 'code':
        return item.data.code;
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
    <motion.div
      className={cn(
        'relative flex items-center gap-2 h-9 px-2.5 rounded-md cursor-pointer transition-colors',
        isHovered ? 'bg-surface-hover' : 'bg-transparent',
        isSelected && 'bg-accent/20 ring-1 ring-accent'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsRevealed(false);
      }}
      onClick={handleCopy}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-xs font-medium truncate">{item.title}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {isRevealed ? getMainValue() : getMaskedPreview()}
        </div>
      </div>

      {isHovered && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsRevealed(!isRevealed);
            }}
            className="p-0.5 hover:bg-surface rounded transition-colors cursor-pointer"
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
              deleteItem(item.id);
            }}
            className="p-0.5 hover:bg-surface rounded transition-colors text-destructive cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
