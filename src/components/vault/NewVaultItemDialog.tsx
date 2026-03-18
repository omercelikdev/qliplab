import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Building, MapPin, Key, User, Briefcase } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { getVaultFieldMap, VAULT_TYPE_PREFIX, buildVaultTrigger, extractTriggerSuffix, isUniqueTrigger } from '@/lib/triggerEngine';
import type { VaultItem, VaultItemType, VaultItemData } from '@/types/vault';
import { cn } from '@/lib/utils';
import {
  validateVaultFields,
  formatCardNumber, unformatCardNumber,
  formatIban, unformatIban,
  formatSwift, formatCvv,
  formatPhoneNumber,
} from '@/lib/vaultValidation';
import { COUNTRIES, POPULAR_COUNTRY_CODES, getFlag, getDialCode } from '@/lib/countries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editItem?: VaultItem; // When provided, dialog is in edit mode
}

const itemTypes: { type: VaultItemType; icon: typeof CreditCard }[] = [
  { type: 'card', icon: CreditCard },
  { type: 'bank', icon: Building },
  { type: 'address', icon: MapPin },
  { type: 'personal', icon: User },
  { type: 'company', icon: Briefcase },
  { type: 'code', icon: Key },
];

const TYPE_LABELS: Record<VaultItemType, string> = {
  card: 'vault.type.card',
  bank: 'vault.type.bank',
  address: 'vault.type.address',
  personal: 'vault.type.personal',
  company: 'vault.type.company',
  code: 'vault.type.code',
};

const MONTHS = [
  { value: '01', label: '01 - January' },
  { value: '02', label: '02 - February' },
  { value: '03', label: '03 - March' },
  { value: '04', label: '04 - April' },
  { value: '05', label: '05 - May' },
  { value: '06', label: '06 - June' },
  { value: '07', label: '07 - July' },
  { value: '08', label: '08 - August' },
  { value: '09', label: '09 - September' },
  { value: '10', label: '10 - October' },
  { value: '11', label: '11 - November' },
  { value: '12', label: '12 - December' },
];

const DOB_MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function getExpiryYears(): string[] {
  const currentYear = new Date().getFullYear() % 100;
  return Array.from({ length: 11 }, (_, i) =>
    String(currentYear + i).padStart(2, '0'),
  );
}

function getDobDays(): number[] {
  return Array.from({ length: 31 }, (_, i) => i + 1);
}

function getDobYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= 1920; y--) years.push(y);
  return years;
}

export function NewVaultItemDialog({ isOpen, onClose, editItem }: Props) {
  const { t } = useTranslation();
  const isEditMode = !!editItem;
  const [selectedType, setSelectedType] = useState<VaultItemType>('card');
  const [title, setTitle] = useState('');
  const [triggerSuffix, setTriggerSuffix] = useState(''); // user-entered part only
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createItem = useVaultStore((state) => state.createItem);
  const updateItem = useVaultStore((state) => state.updateItem);
  const items = useVaultStore((state) => state.items);

  const expiryYears = useMemo(getExpiryYears, []);
  const dobDays = useMemo(getDobDays, []);
  const dobYears = useMemo(getDobYears, []);

  const popularCountries = useMemo(
    () => COUNTRIES.filter(c => POPULAR_COUNTRY_CODES.has(c.code)),
    [],
  );
  const otherCountries = useMemo(
    () => COUNTRIES.filter(c => !POPULAR_COUNTRY_CODES.has(c.code)),
    [],
  );

  const prefix = VAULT_TYPE_PREFIX[selectedType];
  const fullTrigger = triggerSuffix ? buildVaultTrigger(selectedType, triggerSuffix) : '';

  // Pre-fill form when editing
  useEffect(() => {
    if (editItem && isOpen) {
      setSelectedType(editItem.type);
      setTitle(editItem.title);
      setTriggerSuffix(editItem.trigger ? extractTriggerSuffix(editItem.type, editItem.trigger) : '');
      const data = { ...(editItem.data as unknown as Record<string, string>) };
      if (editItem.type === 'personal') {
        // Parse existing dateOfBirth into select parts
        if (data.dateOfBirth) {
          const parts = data.dateOfBirth.split('/');
          if (parts.length === 3) {
            data.dobDay = parts[0];
            data.dobMonth = parts[1];
            data.dobYear = parts[2];
          }
        }
        // Parse phone: if it starts with a dial code and no phoneCountry, detect it
        if (data.phone && !data.phoneCountry && data.phone.startsWith('+')) {
          // Sort by dial code length desc so longer codes match first (+44 before +4)
          const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
          for (const c of sorted) {
            if (data.phone.startsWith(c.dial + ' ') || data.phone === c.dial) {
              data.phoneCountry = c.code;
              data.phone = data.phone.slice(c.dial.length).trim();
              break;
            }
          }
        }
      }
      setFormData(data);
      setErrors({});
    } else if (!isOpen) {
      setSelectedType('card');
      setTitle('');
      setTriggerSuffix('');
      setFormData({});
      setErrors({});
    }
  }, [editItem, isOpen]);

  // Validate: only alphanumeric, dash, underscore for suffix
  const suffixFormatError = triggerSuffix.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(triggerSuffix)
    ? t('vault.dialog.suffixFormatError')
    : '';
  const uniqueError = triggerSuffix.length > 0 && !suffixFormatError && !isUniqueTrigger(
    selectedType, triggerSuffix, items, editItem?.id
  ) ? t('vault.dialog.triggerExistsError') : '';
  const triggerError = suffixFormatError || uniqueError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (triggerError) return;

    const fieldErrors = validateVaultFields(selectedType, formData);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    // Build clean data for saving
    const cleanData = { ...formData };

    // Unformat masked values
    if (selectedType === 'card' && cleanData.cardNumber) {
      cleanData.cardNumber = unformatCardNumber(cleanData.cardNumber);
    }
    if (selectedType === 'bank' && cleanData.iban) {
      cleanData.iban = unformatIban(cleanData.iban);
    }

    // Combine DOB select parts into single dateOfBirth field
    if (selectedType === 'personal') {
      const { dobDay, dobMonth, dobYear, ...rest } = cleanData;
      if (dobDay && dobMonth && dobYear) {
        rest.dateOfBirth = `${dobDay}/${dobMonth}/${dobYear}`;
      }
      // Combine phone with country dial code
      if (rest.phoneCountry && rest.phone) {
        const dial = getDialCode(rest.phoneCountry);
        rest.phone = dial ? `${dial} ${rest.phone}` : rest.phone;
      }
      Object.assign(cleanData, rest);
      delete cleanData.dobDay;
      delete cleanData.dobMonth;
      delete cleanData.dobYear;
    }

    const triggerValue = triggerSuffix ? fullTrigger : undefined;
    if (isEditMode && editItem) {
      await updateItem(editItem.id, title, cleanData as unknown as VaultItemData, triggerValue);
    } else {
      await createItem(selectedType, title, cleanData as unknown as VaultItemData, triggerValue);
    }
    setTitle('');
    setTriggerSuffix('');
    setFormData({});
    setErrors({});
    onClose();
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const renderFields = () => {
    switch (selectedType) {
      case 'card':
        return (
          <>
            <Input label={t('vault.dialog.card.cardholderName')} value={formData.cardholderName || ''} onChange={(v) => updateField('cardholderName', v)} maxLength={50} error={errors.cardholderName} />
            <Input label={t('vault.dialog.card.cardNumber')} value={formData.cardNumber || ''} onChange={(v) => updateField('cardNumber', v)} placeholder={t('vault.dialog.card.cardNumberPlaceholder')} formatter={formatCardNumber} maxLength={19} inputMode="numeric" error={errors.cardNumber} />
            <div className="grid grid-cols-3 gap-2">
              <Select label={t('vault.dialog.card.month')} value={formData.expiryMonth || ''} onChange={(v) => updateField('expiryMonth', v)} error={errors.expiryMonth} placeholder="MM">
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
              <Select label={t('vault.dialog.card.year')} value={formData.expiryYear || ''} onChange={(v) => updateField('expiryYear', v)} error={errors.expiryYear} placeholder="YY">
                {expiryYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
              <Input label="CVV" value={formData.cvv || ''} onChange={(v) => updateField('cvv', v)} placeholder={t('vault.dialog.card.cvvPlaceholder')} formatter={formatCvv} maxLength={4} inputMode="numeric" type="password" error={errors.cvv} />
            </div>
          </>
        );
      case 'bank':
        return (
          <>
            <Input label={t('vault.dialog.bank.bankName')} value={formData.bankName || ''} onChange={(v) => updateField('bankName', v)} maxLength={100} error={errors.bankName} />
            <Input label={t('vault.dialog.bank.accountHolder')} value={formData.accountHolder || ''} onChange={(v) => updateField('accountHolder', v)} maxLength={100} error={errors.accountHolder} />
            <Input label="IBAN" value={formData.iban || ''} onChange={(v) => updateField('iban', v)} formatter={formatIban} maxLength={42} error={errors.iban} />
            <Input label="SWIFT (optional)" value={formData.swift || ''} onChange={(v) => updateField('swift', v)} formatter={formatSwift} maxLength={11} error={errors.swift} />
          </>
        );
      case 'address':
        return (
          <>
            <Input label={t('vault.dialog.address.street')} value={formData.street || ''} onChange={(v) => updateField('street', v)} maxLength={200} error={errors.street} />
            <Input label={t('vault.dialog.address.line2')} value={formData.addressLine2 || ''} onChange={(v) => updateField('addressLine2', v)} maxLength={100} placeholder={t('vault.dialog.address.line2Placeholder')} />
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('vault.dialog.address.city')} value={formData.city || ''} onChange={(v) => updateField('city', v)} maxLength={100} error={errors.city} />
              <Input label={t('vault.dialog.address.state')} value={formData.state || ''} onChange={(v) => updateField('state', v)} maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('vault.dialog.address.postalCode')} value={formData.postalCode || ''} onChange={(v) => updateField('postalCode', v)} maxLength={15} />
              <Input label={t('vault.dialog.address.country')} value={formData.country || ''} onChange={(v) => updateField('country', v)} maxLength={60} error={errors.country} />
            </div>
          </>
        );
      case 'personal':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('vault.dialog.personal.firstName')} value={formData.firstName || ''} onChange={(v) => updateField('firstName', v)} maxLength={50} error={errors.firstName} />
              <Input label={t('vault.dialog.personal.lastName')} value={formData.lastName || ''} onChange={(v) => updateField('lastName', v)} maxLength={50} error={errors.lastName} />
            </div>
            <Input label={t('vault.dialog.personal.email')} value={formData.email || ''} onChange={(v) => updateField('email', v)} placeholder={t('vault.dialog.personal.emailPlaceholder')} maxLength={100} inputMode="email" error={errors.email} />

            {/* Phone with country code selector */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('vault.dialog.personal.phone')}</label>
              <div className="flex gap-1.5">
                <select
                  value={formData.phoneCountry || ''}
                  onChange={(e) => updateField('phoneCountry', e.target.value)}
                  className="w-[110px] px-2 py-2 bg-surface border border-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-accent cursor-pointer shrink-0"
                >
                  <option value="">Country</option>
                  <optgroup label="Popular">
                    {popularCountries.map(c => (
                      <option key={c.code} value={c.code}>{getFlag(c.code)} {c.dial}</option>
                    ))}
                  </optgroup>
                  <optgroup label="All Countries">
                    {otherCountries.map(c => (
                      <option key={c.code} value={c.code}>{getFlag(c.code)} {c.name} {c.dial}</option>
                    ))}
                  </optgroup>
                </select>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => updateField('phone', formatPhoneNumber(e.target.value))}
                  placeholder={t('vault.dialog.personal.phonePlaceholder')}
                  maxLength={15}
                  className={cn(
                    'flex-1 px-3 py-2 bg-surface border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent',
                    errors.phone ? 'border-destructive' : 'border-border',
                  )}
                />
              </div>
              {errors.phone && <p className="text-[10px] text-destructive">{errors.phone}</p>}
            </div>

            {/* Date of Birth — 3 selects */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('vault.dialog.personal.dateOfBirth')}</label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={formData.dobDay || ''} onChange={(v) => updateField('dobDay', v)} placeholder={t('vault.dialog.personal.day')}>
                  {dobDays.map(d => (
                    <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                  ))}
                </Select>
                <Select value={formData.dobMonth || ''} onChange={(v) => updateField('dobMonth', v)} placeholder={t('vault.dialog.personal.month')}>
                  {DOB_MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
                <Select value={formData.dobYear || ''} onChange={(v) => updateField('dobYear', v)} placeholder={t('vault.dialog.personal.year')}>
                  {dobYears.map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </Select>
              </div>
              {errors.dateOfBirth && <p className="text-[10px] text-destructive">{errors.dateOfBirth}</p>}
            </div>
          </>
        );
      case 'company':
        return (
          <>
            <Input label={t('vault.dialog.company.companyName')} value={formData.companyName || ''} onChange={(v) => updateField('companyName', v)} maxLength={100} error={errors.companyName} />
            <Input label={t('vault.dialog.company.taxId')} value={formData.taxId || ''} onChange={(v) => updateField('taxId', v)} maxLength={30} error={errors.taxId} />
            <Input label={t('vault.dialog.company.registrationNumber')} value={formData.registrationNumber || ''} onChange={(v) => updateField('registrationNumber', v)} maxLength={30} />
            <Input label={t('vault.dialog.company.website')} value={formData.website || ''} onChange={(v) => updateField('website', v)} placeholder={t('vault.dialog.company.websitePlaceholder')} maxLength={200} error={errors.website} />
          </>
        );
      case 'code':
        return (
          <>
            <Input label={t('vault.dialog.code.codePin')} value={formData.code || ''} onChange={(v) => updateField('code', v)} type="password" maxLength={200} error={errors.code} />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('vault.dialog.code.notes')}</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value.slice(0, 500))}
                rows={3}
                maxLength={500}
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
              <h2 className="font-semibold">{isEditMode ? t('vault.dialog.editTitle') : t('vault.dialog.newTitle')}</h2>
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
                {itemTypes.map(({ type, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isEditMode}
                    onClick={() => {
                      if (!isEditMode) {
                        setSelectedType(type);
                        setFormData({});
                        setErrors({});
                        setTriggerSuffix('');
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
                    <span className="text-xs">{t(TYPE_LABELS[type])}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <Input label={t('vault.dialog.titleLabel')} value={title} onChange={setTitle} placeholder={t('vault.dialog.titlePlaceholder')} />

              {/* Trigger with auto-prefix */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('vault.dialog.triggerLabel')}</label>
                <div className={cn(
                  'flex items-center bg-surface border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-accent',
                  triggerError ? 'border-destructive' : 'border-border'
                )}>
                  <span className="px-2.5 py-2 text-sm font-mono text-muted-foreground bg-surface-hover shrink-0 select-none border-e border-border">
                    {prefix}
                  </span>
                  <input
                    type="text"
                    value={triggerSuffix}
                    onChange={(e) => setTriggerSuffix(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder={t('vault.dialog.triggerPlaceholder')}
                    className="flex-1 px-2.5 py-2 bg-transparent text-sm font-mono outline-none"
                  />
                </div>
                {triggerError && (
                  <p className="text-[10px] text-destructive">{triggerError}</p>
                )}
                {triggerSuffix && !triggerError && (() => {
                  const fields = getVaultFieldMap(selectedType);
                  const subs = fields.filter(f => f.suffix !== '');
                  if (subs.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">{t('vault.dialog.fieldsLabel')}</span>
                      {subs.map(f => (
                        <span key={f.suffix} className="text-[10px] font-mono text-violet-500 bg-violet-500/10 px-1 rounded">
                          {fullTrigger}{f.suffix}
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
                {isEditMode ? t('vault.dialog.saveChanges') : t('vault.dialog.saveToVault')}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Reusable form components ────────────────────────────────────────

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  maxLength,
  formatter,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  maxLength?: number;
  formatter?: (value: string) => string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
}) {
  const handleChange = (v: string) => {
    onChange(formatter ? formatter(v) : v);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={cn(
          'w-full px-3 py-2 bg-surface border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent',
          error ? 'border-destructive' : 'border-border',
        )}
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  error,
  placeholder,
  children,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-muted-foreground">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 bg-surface border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent cursor-pointer',
          error ? 'border-destructive' : 'border-border',
          !value && 'text-muted-foreground',
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
