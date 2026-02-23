import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useSnippetStore } from '@/stores/snippetStore';
import { useVaultStore } from '@/stores/vaultStore';
import { expandVariables } from '@/lib/snippetVariables';
import type { Snippet } from '@/types/snippet';
import type {
  VaultItem, VaultItemType,
  CardData, BankData, AddressData, PersonalData, CompanyData, CodeData,
} from '@/types/vault';

// --- Trigger validation ---

export const TRIGGER_PREFIXES = [';', '/', '!', ':', '@', '\\'];

/** Trigger must start with a valid prefix and be at least 2 chars */
export function isValidTrigger(trigger: string): boolean {
  if (trigger.length < 2) return false;
  return TRIGGER_PREFIXES.includes(trigger[0]);
}

// --- Vault field maps ---

interface FieldMapping {
  suffix: string;  // e.g. ".name" — empty string = default field
  field: string;   // key in the data object
}

const VAULT_FIELD_MAPS: Record<string, FieldMapping[]> = {
  card: [
    { suffix: '', field: 'cardNumber' },
    { suffix: '.name', field: 'cardholderName' },
    { suffix: '.cvv', field: 'cvv' },
    { suffix: '.exp', field: '_expiry' }, // special: combined month/year
  ],
  bank: [
    { suffix: '', field: 'iban' },
    { suffix: '.holder', field: 'accountHolder' },
    { suffix: '.swift', field: 'swift' },
    { suffix: '.name', field: 'bankName' },
  ],
  address: [
    { suffix: '', field: '_fullAddress' }, // special: combined
    { suffix: '.street', field: 'street' },
    { suffix: '.city', field: 'city' },
    { suffix: '.zip', field: 'postalCode' },
    { suffix: '.country', field: 'country' },
  ],
  personal: [
    { suffix: '', field: '_fullName' }, // special: combined firstName + lastName
    { suffix: '.first', field: 'firstName' },
    { suffix: '.last', field: 'lastName' },
    { suffix: '.email', field: 'email' },
    { suffix: '.phone', field: 'phone' },
    { suffix: '.dob', field: 'dateOfBirth' },
  ],
  company: [
    { suffix: '', field: 'companyName' },
    { suffix: '.tax', field: 'taxId' },
    { suffix: '.reg', field: 'registrationNumber' },
    { suffix: '.web', field: 'website' },
  ],
  code: [
    { suffix: '', field: 'code' },
    { suffix: '.notes', field: 'notes' },
  ],
};

export type { FieldMapping };

export function getVaultFieldMap(type: VaultItemType): FieldMapping[] {
  return VAULT_FIELD_MAPS[type] ?? [];
}

/** Get a specific field value from a vault item (handles special computed fields) */
export function getVaultFieldValue(item: VaultItem, field?: string): string {
  const data = item.data as unknown as Record<string, string | undefined>;

  // Special computed fields
  if (field === '_expiry' && item.type === 'card') {
    const d = item.data as CardData;
    return `${d.expiryMonth}/${d.expiryYear}`;
  }
  if (field === '_fullAddress' && item.type === 'address') {
    const d = item.data as AddressData;
    return [d.street, `${d.postalCode} ${d.city}`, d.country].filter(Boolean).join(', ');
  }
  if (field === '_fullName' && item.type === 'personal') {
    const d = item.data as PersonalData;
    return [d.firstName, d.lastName].filter(Boolean).join(' ');
  }

  // Default field (no field specified) — return main value
  if (!field) {
    switch (item.type) {
      case 'card': return (item.data as CardData).cardNumber;
      case 'bank': return (item.data as BankData).iban;
      case 'address': {
        const d = item.data as AddressData;
        return [d.street, `${d.postalCode} ${d.city}`, d.country].filter(Boolean).join(', ');
      }
      case 'personal': {
        const d = item.data as PersonalData;
        return [d.firstName, d.lastName].filter(Boolean).join(' ');
      }
      case 'company': return (item.data as CompanyData).companyName;
      case 'code': return (item.data as CodeData).code;
      default: return JSON.stringify(item.data);
    }
  }

  return data[field] ?? '';
}

// --- Trigger collection ---

/** Collect all triggers from snippets + vault (when unlocked) */
export function collectTriggers(
  snippets: Snippet[],
  vaultItems: VaultItem[],
  vaultLocked: boolean,
): [string, string][] {
  const triggers: [string, string][] = [];

  // Snippet triggers: sourceId = "snippet:<uuid>"
  for (const s of snippets) {
    if (s.trigger && s.trigger.length > 0) {
      triggers.push([s.trigger, `snippet:${s.id}`]);
    }
  }

  // Vault triggers: only when unlocked
  if (!vaultLocked) {
    for (const item of vaultItems) {
      if (!item.trigger || item.trigger.length === 0) continue;

      const fieldMap = getVaultFieldMap(item.type);
      for (const { suffix, field } of fieldMap) {
        const triggerText = item.trigger + suffix;
        // sourceId = "vault:<uuid>:<field>" — empty field means default
        const sourceId = `vault:${item.id}:${field}`;
        triggers.push([triggerText, sourceId]);
      }
    }
  }

  return triggers;
}

// --- Trigger expansion ---

/** Expand a matched trigger — dispatches to snippet or vault based on sourceId prefix */
export async function expandTrigger(sourceId: string, triggerLen: number): Promise<void> {
  try {
    // Pause keystroke capture
    await invoke('set_trigger_expanding', { expanding: true });

    // Delete trigger text with backspaces
    await invoke('simulate_backspace', { count: triggerLen });
    await new Promise((resolve) => setTimeout(resolve, 50 + triggerLen * 15));

    let content: string;

    if (sourceId.startsWith('snippet:')) {
      const snippetId = sourceId.slice('snippet:'.length);
      const snippet = useSnippetStore.getState().snippets.find((s) => s.id === snippetId);
      if (!snippet) return;
      content = await expandVariables(snippet.content);
    } else if (sourceId.startsWith('vault:')) {
      // Format: "vault:<uuid>:<field>"
      const parts = sourceId.split(':');
      const itemId = parts[1];
      const field = parts.slice(2).join(':'); // field may be empty
      const item = useVaultStore.getState().items.find((i) => i.id === itemId);
      if (!item) return;
      content = getVaultFieldValue(item, field || undefined);
    } else {
      return;
    }

    // Write to clipboard and paste in place
    await writeText(content);
    await invoke('simulate_paste_in_place');
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch {
    // Expansion failed silently
  } finally {
    await invoke('set_trigger_expanding', { expanding: false });
  }
}
