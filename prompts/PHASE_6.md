# PHASE 6: Secure Vault

> **First read:** `prompts/COMMON.md` for Master Instructions
> **Prerequisites:** PHASE 1-5 completed

---

## PROMPT

```
Continuing qliplab. This is PHASE 6 - Secure Vault with AES-256 encryption.

## READ FIRST
- CLAUDE.md
- docs/PROGRESS.md

## STEP 1: Encryption Utility

**src/lib/encryption.ts:**
```typescript
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext: string, password: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);
  
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(decrypted);
}

export async function hashPassword(password: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}
```

## STEP 2: Update Database

Add to **src/lib/database.ts** initDatabase():
```typescript
await db.execute(`
  CREATE TABLE IF NOT EXISTS vault_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    icon TEXT,
    is_favorite INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS vault_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);
```

## STEP 3: Vault Types

**src/types/vault.ts:**
```typescript
export type VaultItemType = 'address' | 'card' | 'bank' | 'personal' | 'company' | 'code';

export interface VaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  data: any;
  icon?: string;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardData { cardholderName: string; cardNumber: string; expiryMonth: string; expiryYear: string; cvv: string; }
export interface BankData { bankName: string; accountHolder: string; iban: string; swift?: string; }
export interface AddressData { street: string; city: string; postalCode: string; country: string; }
export interface CodeData { code: string; notes?: string; }
```

## STEP 4: Vault Store

**src/stores/vaultStore.ts:**
```typescript
import { create } from 'zustand';
import { getDatabase } from '@/lib/database';
import { encrypt, decrypt, hashPassword } from '@/lib/encryption';
import type { VaultItem, VaultItemType } from '@/types/vault';

let sessionPassword: string | null = null;

interface VaultState {
  isLocked: boolean;
  items: VaultItem[];
  
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  loadItems: (password: string) => Promise<void>;
  createItem: (type: VaultItemType, title: string, data: any) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isLocked: true,
  items: [],
  
  unlock: async (password) => {
    const db = getDatabase();
    const result = await db.select<any[]>("SELECT value FROM vault_settings WHERE key = 'master_password_hash'");
    
    if (result.length === 0) {
      // First time - set password
      const hash = await hashPassword(password);
      await db.execute("INSERT INTO vault_settings (key, value) VALUES ('master_password_hash', ?)", [hash]);
      sessionPassword = password;
      set({ isLocked: false });
      return true;
    }
    
    const storedHash = result[0].value;
    const inputHash = await hashPassword(password);
    
    if (storedHash === inputHash) {
      sessionPassword = password;
      await get().loadItems(password);
      set({ isLocked: false });
      return true;
    }
    return false;
  },
  
  lock: () => {
    sessionPassword = null;
    set({ isLocked: true, items: [] });
  },
  
  loadItems: async (password) => {
    const db = getDatabase();
    const result = await db.select<any[]>('SELECT * FROM vault_items ORDER BY sort_order');
    
    const items: VaultItem[] = await Promise.all(
      result.map(async (row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        data: JSON.parse(await decrypt(row.encrypted_data, password)),
        icon: row.icon,
        isFavorite: row.is_favorite === 1,
        sortOrder: row.sort_order,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }))
    );
    set({ items });
  },
  
  createItem: async (type, title, data) => {
    if (!sessionPassword) return;
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const encryptedData = await encrypt(JSON.stringify(data), sessionPassword);
    
    await db.execute(
      `INSERT INTO vault_items (id, type, title, encrypted_data, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, type, title, encryptedData, 0, now, now]
    );
    await get().loadItems(sessionPassword);
  },
  
  deleteItem: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM vault_items WHERE id = ?', [id]);
    set(state => ({ items: state.items.filter(i => i.id !== id) }));
  },
}));
```

## STEP 5: Vault Components

**src/components/vault/VaultLock.tsx:**
```typescript
import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import { cn } from '@/lib/utils';

export function VaultLock() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { unlock } = useVaultStore();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await unlock(password);
    if (!success) setError('Incorrect password');
    setPassword('');
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="p-4 bg-surface rounded-full mb-4"><Lock className="w-8 h-8 text-muted-foreground" /></div>
      <h2 className="text-lg font-semibold mb-2">Vault Locked</h2>
      <p className="text-sm text-muted-foreground mb-6">Enter master password to unlock</p>
      
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Master password"
            className={cn('w-full px-3 py-2 pr-10 bg-surface border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent', error && 'border-destructive')} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
            {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" className={cn('w-full py-2 text-sm font-medium', 'bg-accent text-accent-foreground rounded-lg hover:bg-accent/90')}>Unlock</button>
      </form>
    </div>
  );
}
```

**src/components/vault/VaultItem.tsx:**
```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Copy, Trash2, CreditCard, Building, MapPin, Key } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useVaultStore } from '@/stores/vaultStore';
import type { VaultItem as VaultItemType } from '@/types/vault';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, any> = { card: CreditCard, bank: Building, address: MapPin, code: Key };

export function VaultItem({ item }: { item: VaultItemType }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const { deleteItem } = useVaultStore();
  
  const Icon = typeIcons[item.type] || Key;
  
  const getMainValue = () => {
    switch (item.type) {
      case 'card': return item.data.cardNumber;
      case 'bank': return item.data.iban;
      case 'address': return item.data.street;
      case 'code': return item.data.code;
      default: return JSON.stringify(item.data);
    }
  };
  
  const getMaskedPreview = () => {
    const value = getMainValue();
    if (item.type === 'card') return `•••• •••• •••• ${value?.slice(-4) || '****'}`;
    if (item.type === 'bank') return `TR•• •••• •••• ${value?.slice(-4) || '****'}`;
    return '••••••••••';
  };
  
  const handleCopy = async () => { await writeText(getMainValue()); };
  
  return (
    <motion.div
      className={cn('relative flex items-center gap-3 h-11 px-3 rounded-lg cursor-pointer transition-colors', isHovered ? 'bg-surface-hover' : 'bg-transparent')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsRevealed(false); }}
      onClick={handleCopy}
    >
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.title}</div>
        <div className="text-xs text-muted-foreground truncate">{isRevealed ? getMainValue() : getMaskedPreview()}</div>
      </div>
      
      {isHovered && (
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); setIsRevealed(!isRevealed); }} className="p-1 hover:bg-surface rounded">
            {isRevealed ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }} className="p-1 hover:bg-surface rounded text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
```

**src/components/vault/VaultList.tsx:**
```typescript
import { Plus, Lock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVaultStore } from '@/stores/vaultStore';
import { VaultItem } from './VaultItem';
import { VaultLock } from './VaultLock';
import { cn } from '@/lib/utils';

export function VaultList() {
  const { isLocked, items, lock } = useVaultStore();
  
  if (isLocked) return <VaultLock />;
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end px-2 py-1 border-b border-border/50">
        <button onClick={lock} className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded">
          <Lock className="w-3 h-3" /> Lock
        </button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {items.map(item => <VaultItem key={item.id} item={item} />)}
          {items.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">No vault items. Add one!</div>}
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t border-border/50">
        <button className={cn('w-full flex items-center justify-center gap-2 py-2', 'text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-md')}>
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
    </div>
  );
}
```

## STEP 6: Update App.tsx

```typescript
import { VaultList } from './components/vault/VaultList';

// In JSX:
{activeTab === 'vault' && <VaultList />}
```

## OUTPUT CHECK

- ✅ Vault tab shows lock screen
- ✅ First time: password creates master password
- ✅ Wrong password shows error
- ✅ Correct password unlocks
- ✅ Items encrypted with AES-256-GCM
- ✅ Masked preview (•••• format)
- ✅ Reveal on hover with eye button
- ✅ Click to copy
- ✅ Lock button works

## TEST
1. Go to Vault tab
2. Enter a password (first time = creates it)
3. Vault unlocks
4. Lock and try wrong password → error
5. Correct password → unlocks
```
