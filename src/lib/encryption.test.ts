import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, decryptStrict, encryptApiKey, decryptApiKey, hashPassword, verifyPassword } from './encryption';

// ─── Test 9: Vault Encryption ────────────────────────────────

describe('encrypt / decrypt', () => {
  it('roundtrips plain text', async () => {
    const plaintext = 'my secret password 123!';
    const password = 'masterPass';
    const ciphertext = await encrypt(plaintext, password);

    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.length).toBeGreaterThan(0);

    const decrypted = await decrypt(ciphertext, password);
    expect(decrypted).toBe(plaintext);
  });

  it('roundtrips Unicode text', async () => {
    const plaintext = 'Şifre: güvenli! 🔒';
    const password = 'şifrem123';
    const ciphertext = await encrypt(plaintext, password);
    const decrypted = await decrypt(ciphertext, password);
    expect(decrypted).toBe(plaintext);
  });

  it('roundtrips long JSON data', async () => {
    const data = JSON.stringify({
      username: 'admin',
      password: 'hunter2',
      notes: 'A'.repeat(1000),
    });
    const password = 'vaultMaster';
    const ciphertext = await encrypt(data, password);
    const decrypted = await decrypt(ciphertext, password);
    expect(decrypted).toBe(data);
  });

  it('fails with wrong password', async () => {
    const ciphertext = await encrypt('secret', 'correct');
    await expect(decrypt(ciphertext, 'wrong')).rejects.toThrow();
  });

  it('produces different ciphertext for same input (random IV)', async () => {
    const plaintext = 'same input';
    const password = 'pass';
    const c1 = await encrypt(plaintext, password);
    const c2 = await encrypt(plaintext, password);
    expect(c1).not.toBe(c2); // Random salt + IV
  });
});

// ─── Test 10: Password Hashing ───────────────────────────────

describe('hashPassword / verifyPassword', () => {
  it('creates salted hash and verifies', async () => {
    const hash = await hashPassword('myPassword');
    expect(hash).toContain(':'); // salt:hash format
    expect(await verifyPassword('myPassword', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for same password (random salt)', async () => {
    const h1 = await hashPassword('same');
    const h2 = await hashPassword('same');
    expect(h1).not.toBe(h2); // Different salts
  });

  it('both verify against the same password', async () => {
    const h1 = await hashPassword('test');
    const h2 = await hashPassword('test');
    expect(await verifyPassword('test', h1)).toBe(true);
    expect(await verifyPassword('test', h2)).toBe(true);
  });
});

// ─── Test: decryptStrict ─────────────────────────────────────

describe('decryptStrict', () => {
  it('decrypts data encrypted with current iterations', async () => {
    const ciphertext = await encrypt('test data', 'password');
    const result = await decryptStrict(ciphertext, 'password');
    expect(result).toBe('test data');
  });

  it('fails with wrong password', async () => {
    const ciphertext = await encrypt('secret', 'correct');
    await expect(decryptStrict(ciphertext, 'wrong')).rejects.toThrow();
  });
});

// ─── Test: API Key Encryption ────────────────────────────────

describe('encryptApiKey / decryptApiKey', () => {
  it('roundtrips API key', async () => {
    const key = 'sk-ant-api03-test-key-12345';
    const encrypted = await encryptApiKey(key);
    expect(encrypted).toMatch(/^enc:/);
    const decrypted = await decryptApiKey(encrypted);
    expect(decrypted).toBe(key);
  });

  it('returns empty string for empty input', async () => {
    expect(await encryptApiKey('')).toBe('');
    expect(await decryptApiKey('')).toBe('');
  });

  it('handles legacy plain-text keys', async () => {
    // Legacy keys don't start with "enc:" — returned as-is
    expect(await decryptApiKey('sk-plain-text-key')).toBe('sk-plain-text-key');
  });

  it('produces different ciphertext for same key (random IV)', async () => {
    const key = 'sk-test';
    const e1 = await encryptApiKey(key);
    const e2 = await encryptApiKey(key);
    expect(e1).not.toBe(e2);
  });
});

// ─── Test: Edge Cases ────────────────────────────────────────

describe('edge cases', () => {
  it('encrypts and decrypts empty string', async () => {
    const ciphertext = await encrypt('', 'pass');
    const decrypted = await decrypt(ciphertext, 'pass');
    expect(decrypted).toBe('');
  });

  it('handles very long password', async () => {
    const longPass = 'a'.repeat(1000);
    const ciphertext = await encrypt('data', longPass);
    const decrypted = await decrypt(ciphertext, longPass);
    expect(decrypted).toBe('data');
  });
});
