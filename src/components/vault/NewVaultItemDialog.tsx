import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Building, MapPin, Key } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import type { VaultItemType, VaultItemData } from '@/types/vault';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const itemTypes: { type: VaultItemType; label: string; icon: typeof CreditCard }[] = [
  { type: 'card', label: 'Card', icon: CreditCard },
  { type: 'bank', label: 'Bank', icon: Building },
  { type: 'address', label: 'Address', icon: MapPin },
  { type: 'code', label: 'Code', icon: Key },
];

export function NewVaultItemDialog({ isOpen, onClose }: Props) {
  const [selectedType, setSelectedType] = useState<VaultItemType>('card');
  const [title, setTitle] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const createItem = useVaultStore((state) => state.createItem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createItem(selectedType, title, formData as unknown as VaultItemData);
    setTitle('');
    setFormData({});
    onClose();
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderFields = () => {
    switch (selectedType) {
      case 'card':
        return (
          <>
            <Input label="Cardholder Name" value={formData.cardholderName || ''} onChange={(v) => updateField('cardholderName', v)} />
            <Input label="Card Number" value={formData.cardNumber || ''} onChange={(v) => updateField('cardNumber', v)} placeholder="1234 5678 9012 3456" />
            <div className="grid grid-cols-3 gap-2">
              <Input label="Month" value={formData.expiryMonth || ''} onChange={(v) => updateField('expiryMonth', v)} placeholder="MM" />
              <Input label="Year" value={formData.expiryYear || ''} onChange={(v) => updateField('expiryYear', v)} placeholder="YY" />
              <Input label="CVV" value={formData.cvv || ''} onChange={(v) => updateField('cvv', v)} placeholder="123" type="password" />
            </div>
          </>
        );
      case 'bank':
        return (
          <>
            <Input label="Bank Name" value={formData.bankName || ''} onChange={(v) => updateField('bankName', v)} />
            <Input label="Account Holder" value={formData.accountHolder || ''} onChange={(v) => updateField('accountHolder', v)} />
            <Input label="IBAN" value={formData.iban || ''} onChange={(v) => updateField('iban', v)} />
            <Input label="SWIFT (optional)" value={formData.swift || ''} onChange={(v) => updateField('swift', v)} />
          </>
        );
      case 'address':
        return (
          <>
            <Input label="Street" value={formData.street || ''} onChange={(v) => updateField('street', v)} />
            <Input label="City" value={formData.city || ''} onChange={(v) => updateField('city', v)} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Postal Code" value={formData.postalCode || ''} onChange={(v) => updateField('postalCode', v)} />
              <Input label="Country" value={formData.country || ''} onChange={(v) => updateField('country', v)} />
            </div>
          </>
        );
      case 'code':
        return (
          <>
            <Input label="Code / PIN" value={formData.code || ''} onChange={(v) => updateField('code', v)} type="password" />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 rounded-lg overflow-hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute inset-4 bg-background border border-border rounded-xl shadow-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
              <h2 className="font-semibold">New Vault Item</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
              {/* Type Selection */}
              <div className="flex gap-2">
                {itemTypes.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedType(type);
                      setFormData({});
                    }}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors cursor-pointer',
                      selectedType === type
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:bg-surface-hover'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <Input label="Title" value={title} onChange={setTitle} placeholder="e.g. My Visa Card" />

              {/* Type-specific fields */}
              {renderFields()}

              {/* Submit */}
              <button
                type="submit"
                className={cn(
                  'w-full py-2 text-sm font-medium cursor-pointer',
                  'bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors'
                )}
              >
                Save to Vault
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}
