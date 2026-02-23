import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Building, MapPin, Key, User, Briefcase } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { isValidTrigger, TRIGGER_PREFIXES, getVaultFieldMap } from '@/lib/triggerEngine';
import type { VaultItem, VaultItemType, VaultItemData } from '@/types/vault';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editItem?: VaultItem; // When provided, dialog is in edit mode
}

const itemTypes: { type: VaultItemType; label: string; icon: typeof CreditCard }[] = [
  { type: 'card', label: 'Card', icon: CreditCard },
  { type: 'bank', label: 'Bank', icon: Building },
  { type: 'address', label: 'Address', icon: MapPin },
  { type: 'personal', label: 'Personal', icon: User },
  { type: 'company', label: 'Company', icon: Briefcase },
  { type: 'code', label: 'Code', icon: Key },
];

export function NewVaultItemDialog({ isOpen, onClose, editItem }: Props) {
  const isEditMode = !!editItem;
  const [selectedType, setSelectedType] = useState<VaultItemType>('card');
  const [title, setTitle] = useState('');
  const [trigger, setTrigger] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const createItem = useVaultStore((state) => state.createItem);
  const updateItem = useVaultStore((state) => state.updateItem);

  // Pre-fill form when editing
  useEffect(() => {
    if (editItem && isOpen) {
      setSelectedType(editItem.type);
      setTitle(editItem.title);
      setTrigger(editItem.trigger || '');
      setFormData(editItem.data as unknown as Record<string, string>);
    } else if (!isOpen) {
      setSelectedType('card');
      setTitle('');
      setTrigger('');
      setFormData({});
    }
  }, [editItem, isOpen]);

  const triggerError = trigger.length > 0 && !isValidTrigger(trigger)
    ? `Must start with ${TRIGGER_PREFIXES.join(' ')} and be at least 2 chars`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (trigger && !isValidTrigger(trigger)) return;

    if (isEditMode && editItem) {
      await updateItem(editItem.id, title, formData as unknown as VaultItemData, trigger || undefined);
    } else {
      await createItem(selectedType, title, formData as unknown as VaultItemData, trigger || undefined);
    }
    setTitle('');
    setTrigger('');
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
      case 'personal':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input label="First Name" value={formData.firstName || ''} onChange={(v) => updateField('firstName', v)} />
              <Input label="Last Name" value={formData.lastName || ''} onChange={(v) => updateField('lastName', v)} />
            </div>
            <Input label="Email (optional)" value={formData.email || ''} onChange={(v) => updateField('email', v)} placeholder="name@example.com" />
            <Input label="Phone (optional)" value={formData.phone || ''} onChange={(v) => updateField('phone', v)} placeholder="+1 234 567 8900" />
            <Input label="Date of Birth (optional)" value={formData.dateOfBirth || ''} onChange={(v) => updateField('dateOfBirth', v)} placeholder="DD/MM/YYYY" />
          </>
        );
      case 'company':
        return (
          <>
            <Input label="Company Name" value={formData.companyName || ''} onChange={(v) => updateField('companyName', v)} />
            <Input label="Tax ID (optional)" value={formData.taxId || ''} onChange={(v) => updateField('taxId', v)} />
            <Input label="Registration No. (optional)" value={formData.registrationNumber || ''} onChange={(v) => updateField('registrationNumber', v)} />
            <Input label="Website (optional)" value={formData.website || ''} onChange={(v) => updateField('website', v)} placeholder="https://example.com" />
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
              <h2 className="font-semibold">{isEditMode ? 'Edit Vault Item' : 'New Vault Item'}</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-surface-hover rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
              {/* Type Selection — disabled in edit mode */}
              <div className="flex gap-2">
                {itemTypes.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isEditMode}
                    onClick={() => {
                      if (!isEditMode) {
                        setSelectedType(type);
                        setFormData({});
                        setTrigger('');
                      }
                    }}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors',
                      isEditMode ? 'cursor-default' : 'cursor-pointer',
                      selectedType === type
                        ? 'border-accent bg-accent/10 text-accent'
                        : isEditMode
                          ? 'border-border opacity-30'
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

              {/* Trigger */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Trigger (optional)</label>
                <input
                  type="text"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder=";card"
                  className={cn(
                    'w-full px-3 py-2 bg-surface border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-accent',
                    triggerError ? 'border-destructive' : 'border-border'
                  )}
                />
                {triggerError && (
                  <p className="text-[10px] text-destructive">{triggerError}</p>
                )}
                {trigger && isValidTrigger(trigger) && (() => {
                  const fields = getVaultFieldMap(selectedType);
                  const subs = fields.filter(f => f.suffix !== '');
                  if (subs.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">Fields:</span>
                      {subs.map(f => (
                        <span key={f.suffix} className="text-[10px] font-mono text-violet-500 bg-violet-500/10 px-1 rounded">
                          {trigger}{f.suffix}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>

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
                {isEditMode ? 'Save Changes' : 'Save to Vault'}
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
