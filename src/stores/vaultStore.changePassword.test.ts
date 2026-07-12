import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory fake of the two tables changePassword touches.
let hashRow: { value: string } | null;
let itemRows: { id: string; encrypted_data: string }[];

const defaultExecute = async (sql: string, args: unknown[]) => {
  if (sql.includes('UPDATE vault_items SET encrypted_data')) {
    const [data, id] = args as [string, string];
    const row = itemRows.find((r) => r.id === id);
    if (row) row.encrypted_data = data;
  } else if (sql.includes("master_password_hash")) {
    hashRow = { value: args[0] as string };
  }
};

const execute = vi.fn(defaultExecute);

const select = vi.fn(async (sql: string) => {
  if (sql.includes('master_password_hash')) return hashRow ? [hashRow] : [];
  if (sql.includes('FROM vault_items')) return itemRows.map((r) => ({ ...r }));
  return [];
});

vi.mock('@/lib/database', () => ({ getDatabase: () => ({ execute, select }) }));

// Encryption is modeled as reversible tagged strings so the store logic
// (verify → decrypt → re-encrypt → rewrite) is exercised without real crypto.
vi.mock('@/lib/encryption', () => ({
  // "enc(<password>):<plaintext>"
  encrypt: vi.fn(async (plaintext: string, password: string) => `enc(${password}):${plaintext}`),
  decryptStrict: vi.fn(async (ciphertext: string, password: string) => {
    const prefix = `enc(${password}):`;
    if (!ciphertext.startsWith(prefix)) throw new Error('strict fail');
    return ciphertext.slice(prefix.length);
  }),
  decrypt: vi.fn(async (ciphertext: string, password: string) => {
    const prefix = `enc(${password}):`;
    if (!ciphertext.startsWith(prefix)) throw new Error('decrypt fail');
    return ciphertext.slice(prefix.length);
  }),
  // "hash:<password>"
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
  verifyPassword: vi.fn(async (password: string, storedHash: string) => storedHash === `hash:${password}`),
}));

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ settings: { autoLockMinutes: 0 } }) },
}));
vi.mock('@/lib/autoLock', () => ({ computeAutoLockDelayMs: () => null }));

import { useVaultStore } from './vaultStore';

describe('vaultStore.changePassword', () => {
  beforeEach(() => {
    execute.mockReset();
    execute.mockImplementation(defaultExecute);
    hashRow = { value: 'hash:old' };
    itemRows = [
      { id: 'a', encrypted_data: 'enc(old):{"code":"1"}' },
      { id: 'b', encrypted_data: 'enc(old):{"code":"2"}' },
    ];
  });

  it('re-encrypts every item and swaps the hash on success', async () => {
    const result = await useVaultStore.getState().changePassword('old', 'newpass');
    expect(result).toBe('ok');
    expect(itemRows.map((r) => r.encrypted_data)).toEqual([
      'enc(newpass):{"code":"1"}',
      'enc(newpass):{"code":"2"}',
    ]);
    expect(hashRow).toEqual({ value: 'hash:newpass' });
  });

  it('rejects a wrong current password without touching anything', async () => {
    const result = await useVaultStore.getState().changePassword('wrong', 'newpass');
    expect(result).toBe('wrong_password');
    expect(itemRows.map((r) => r.encrypted_data)).toEqual([
      'enc(old):{"code":"1"}',
      'enc(old):{"code":"2"}',
    ]);
    expect(hashRow).toEqual({ value: 'hash:old' });
  });

  it('aborts intact when an item cannot be decrypted', async () => {
    // A corrupted / foreign-key row that neither strict nor legacy can open.
    itemRows.push({ id: 'c', encrypted_data: 'enc(other):{"code":"3"}' });
    const result = await useVaultStore.getState().changePassword('old', 'newpass');
    expect(result).toBe('decrypt_error');
    // Nothing was written: hash and every row stay on the old password.
    expect(hashRow).toEqual({ value: 'hash:old' });
    expect(itemRows.every((r) => r.encrypted_data.startsWith('enc(old):') || r.encrypted_data.startsWith('enc(other):'))).toBe(true);
  });

  it('rolls written rows back to old ciphertext if a write fails mid-way', async () => {
    // Fail the hash write (the last write) to trigger rollback of item writes.
    execute.mockImplementation(async (sql: string, args: unknown[]) => {
      if (sql.includes("master_password_hash")) throw new Error('disk full');
      if (sql.includes('UPDATE vault_items SET encrypted_data')) {
        const [data, id] = args as [string, string];
        const row = itemRows.find((r) => r.id === id);
        if (row) row.encrypted_data = data;
      }
    });
    const result = await useVaultStore.getState().changePassword('old', 'newpass');
    expect(result).toBe('error');
    // Every item row is rolled back to its original old-password ciphertext.
    expect(itemRows.map((r) => r.encrypted_data)).toEqual([
      'enc(old):{"code":"1"}',
      'enc(old):{"code":"2"}',
    ]);
    expect(hashRow).toEqual({ value: 'hash:old' });
  });

  it('succeeds on an empty vault (no items, just re-key the hash)', async () => {
    itemRows = [];
    const result = await useVaultStore.getState().changePassword('old', 'newpass');
    expect(result).toBe('ok');
    expect(hashRow).toEqual({ value: 'hash:newpass' });
  });
});
