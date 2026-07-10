/**
 * Master password rules for first-time vault setup.
 *
 * The vault is encrypted with a key derived from this password and nothing
 * else — there is no recovery key, no reset, no escrow. A typo on the single
 * "create password" field would encrypt everything under a password the user
 * never intended, permanently. Hence: a confirmation field and a length floor.
 */

export const MIN_VAULT_PASSWORD_LENGTH = 8;

/** Error code, or null when the password may be used. Callers map to i18n. */
export type VaultPasswordError = 'tooShort' | 'mismatch';

export function validateNewVaultPassword(
  password: string,
  confirmation: string,
): VaultPasswordError | null {
  if (password.length < MIN_VAULT_PASSWORD_LENGTH) return 'tooShort';
  if (password !== confirmation) return 'mismatch';
  return null;
}
