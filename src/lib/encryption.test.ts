import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, decryptStrict, hashPassword, verifyPassword } from './encryption';

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

// ─── Test: Legacy iteration fallback (line 83) ─────────────

describe('legacy iteration fallback', () => {
  it('decrypt throws when both current and legacy iterations fail', async () => {
    // Corrupt ciphertext that will fail both iteration counts
    const fakeCiphertext = btoa('a'.repeat(100)); // Invalid encrypted data
    await expect(decrypt(fakeCiphertext, 'password')).rejects.toThrow();
  });

  it('decrypt succeeds with data encrypted using legacy 100K iterations', async () => {
    // Manually encrypt with 100K iterations to simulate legacy data
    const encoder = new TextEncoder();
    const password = 'legacyPass';
    const plaintext = 'legacy secret';
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const legacyKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      legacyKey,
      encoder.encode(plaintext)
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    const legacyCiphertext = btoa(binary);

    // decrypt() should fail with 210K iterations, then succeed with 100K fallback
    const result = await decrypt(legacyCiphertext, password);
    expect(result).toBe(plaintext);
  });
});

// ─── Test: timingSafeEqual different-length branch (line 151) ─

describe('timingSafeEqual different-length strings', () => {
  it('rejects password when hash lengths differ', async () => {
    // A stored hash with different length will hit the early return in timingSafeEqual
    // We use a salted format hash but tamper with it so computed vs stored lengths differ
    const hash = await hashPassword('myPassword');
    const tamperedHash = hash + 'extra'; // Different length from any computed hash
    expect(await verifyPassword('myPassword', tamperedHash)).toBe(false);
  });
});

// ─── Test: Legacy unsalted password verification (lines 170-172) ─

describe('legacy unsalted password verification', () => {
  it('verifies against legacy unsalted SHA-256 hash', async () => {
    // Create a legacy-format hash: base64(SHA-256(password)) without salt
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode('testpass'));
    const bytes = new Uint8Array(hash);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const legacyHash = btoa(binary); // No colon, no salt prefix

    expect(await verifyPassword('testpass', legacyHash)).toBe(true);
    expect(await verifyPassword('wrongpass', legacyHash)).toBe(false);
  });
});
