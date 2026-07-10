import { describe, it, expect } from 'vitest';
import { validateNewVaultPassword, MIN_VAULT_PASSWORD_LENGTH } from './vaultPassword';

describe('validateNewVaultPassword', () => {
  const ok = 'correct horse battery';

  it('accepts a long enough password that matches its confirmation', () => {
    expect(validateNewVaultPassword(ok, ok)).toBeNull();
  });

  it('rejects passwords below the minimum length', () => {
    const short = 'a'.repeat(MIN_VAULT_PASSWORD_LENGTH - 1);
    expect(validateNewVaultPassword(short, short)).toBe('tooShort');
  });

  it('accepts exactly the minimum length', () => {
    const exact = 'a'.repeat(MIN_VAULT_PASSWORD_LENGTH);
    expect(validateNewVaultPassword(exact, exact)).toBeNull();
  });

  // Regression: setup used a single field, so a typo silently encrypted the
  // vault under a password the user never meant to choose. Unrecoverable.
  it('rejects a mismatched confirmation', () => {
    expect(validateNewVaultPassword(ok, `${ok}x`)).toBe('mismatch');
    expect(validateNewVaultPassword(ok, '')).toBe('mismatch');
  });

  it('reports length before mismatch so the user fixes the real problem first', () => {
    expect(validateNewVaultPassword('short', 'different')).toBe('tooShort');
  });

  it('treats whitespace as legitimate password characters', () => {
    const spaced = '  spaced out  ';
    expect(validateNewVaultPassword(spaced, spaced)).toBeNull();
    expect(validateNewVaultPassword(spaced, spaced.trim())).toBe('mismatch');
  });
});
