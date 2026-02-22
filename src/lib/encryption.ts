const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Convert Uint8Array to base64 without spread operator (avoids stack overflow on large data)
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
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
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return uint8ArrayToBase64(combined);
}

export async function decrypt(ciphertext: string, password: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);

  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(decrypted);
}

// Hash password with salt for secure storage. Format: base64(salt):base64(hash)
// If salt is provided, uses it (for verification). Otherwise generates a new one.
export async function hashPassword(password: string, existingSalt?: Uint8Array): Promise<string> {
  const salt = existingSalt ?? crypto.getRandomValues(new Uint8Array(16));
  const saltedInput = new Uint8Array(salt.length + encoder.encode(password).length);
  saltedInput.set(salt, 0);
  saltedInput.set(encoder.encode(password), salt.length);

  const hash = await crypto.subtle.digest('SHA-256', saltedInput);
  return `${uint8ArrayToBase64(salt)}:${uint8ArrayToBase64(new Uint8Array(hash))}`;
}

// Verify a password against a stored hash (supports both salted and legacy unsalted format)
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.includes(':')) {
    // Salted format: base64(salt):base64(hash)
    const [saltB64] = storedHash.split(':');
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const computedHash = await hashPassword(password, salt);
    return computedHash === storedHash;
  }

  // Legacy unsalted format: base64(SHA-256(password))
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  const legacyHash = uint8ArrayToBase64(new Uint8Array(hash));
  return legacyHash === storedHash;
}
