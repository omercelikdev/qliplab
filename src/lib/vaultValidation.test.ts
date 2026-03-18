import { describe, it, expect } from 'vitest';
import {
  formatCardNumber,
  unformatCardNumber,
  formatIban,
  unformatIban,
  formatSwift,
  formatCvv,
  formatPhoneNumber,
  validateRequired,
  validateLuhn,
  validateCardNumber,
  validateExpiryMonth,
  validateExpiryYear,
  validateExpiry,
  validateCvv,
  validateIban,
  validateSwift,
  validateEmail,
  validatePhone,
  validateDateOfBirth,
  validateUrl,
  validateVaultFields,
} from './vaultValidation';

// ── Formatters ──────────────────────────────────────────────────────

describe('formatCardNumber', () => {
  it('formats 16 digits into groups of 4', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
  });

  it('strips non-digits', () => {
    expect(formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
  });

  it('truncates to 16 digits', () => {
    expect(formatCardNumber('41111111111111119999')).toBe('4111 1111 1111 1111');
  });

  it('handles partial input', () => {
    expect(formatCardNumber('4111')).toBe('4111');
    expect(formatCardNumber('411111')).toBe('4111 11');
  });

  it('handles empty string', () => {
    expect(formatCardNumber('')).toBe('');
  });
});

describe('unformatCardNumber', () => {
  it('strips spaces', () => {
    expect(unformatCardNumber('4111 1111 1111 1111')).toBe('4111111111111111');
  });

  it('handles no spaces', () => {
    expect(unformatCardNumber('4111111111111111')).toBe('4111111111111111');
  });
});

describe('formatIban', () => {
  it('formats IBAN with groups of 4', () => {
    expect(formatIban('TR330006100519786457841326')).toBe('TR33 0006 1005 1978 6457 8413 26');
  });

  it('uppercases and strips spaces', () => {
    expect(formatIban('tr33 0006')).toBe('TR33 0006');
  });

  it('truncates to 34 characters', () => {
    const long = 'TR330006100519786457841326999999999999';
    expect(unformatIban(formatIban(long)).length).toBeLessThanOrEqual(34);
  });
});

describe('unformatIban', () => {
  it('strips spaces', () => {
    expect(unformatIban('TR33 0006 1005')).toBe('TR3300061005');
  });
});

describe('formatSwift', () => {
  it('uppercases and strips non-alphanumeric', () => {
    expect(formatSwift('akba-tris')).toBe('AKBATRIS');
  });

  it('truncates to 11 characters', () => {
    expect(formatSwift('AKBATRISXXX99')).toBe('AKBATRISXXX');
  });
});

describe('formatCvv', () => {
  it('strips non-digits and limits to 4', () => {
    expect(formatCvv('1234')).toBe('1234');
    expect(formatCvv('12345')).toBe('1234');
    expect(formatCvv('12a3')).toBe('123');
  });
});

describe('formatPhoneNumber', () => {
  it('keeps digits, spaces, and dashes', () => {
    expect(formatPhoneNumber('+90 555-123-4567')).toBe('90 555-123-4567');
  });
});

// ── Validators ──────────────────────────────────────────────────────

describe('validateRequired', () => {
  it('returns error for empty string', () => {
    expect(validateRequired('')).toBe('This field is required');
  });

  it('returns error for whitespace only', () => {
    expect(validateRequired('   ')).toBe('This field is required');
  });

  it('returns empty for valid input', () => {
    expect(validateRequired('hello')).toBe('');
  });

  it('checks minimum length', () => {
    expect(validateRequired('a', 2)).toBe('Minimum 2 characters');
    expect(validateRequired('ab', 2)).toBe('');
  });
});

describe('validateLuhn', () => {
  it('validates a correct card number', () => {
    expect(validateLuhn('4111111111111111')).toBe(true); // Visa test
    expect(validateLuhn('5500000000000004')).toBe(true); // Mastercard test
  });

  it('rejects invalid number', () => {
    expect(validateLuhn('4111111111111112')).toBe(false);
  });

  it('rejects non-digit input', () => {
    expect(validateLuhn('411111abc')).toBe(false);
    expect(validateLuhn('')).toBe(false);
  });
});

describe('validateCardNumber', () => {
  it('accepts valid card number', () => {
    expect(validateCardNumber('4111 1111 1111 1111')).toBe('');
  });

  it('rejects empty', () => {
    expect(validateCardNumber('')).toBe('This field is required');
  });

  it('rejects too short', () => {
    expect(validateCardNumber('411111')).toContain('13-16 digits');
  });

  it('rejects invalid Luhn', () => {
    expect(validateCardNumber('4111111111111112')).toBe('Invalid card number');
  });
});

describe('validateExpiryMonth / validateExpiryYear', () => {
  it('requires month', () => {
    expect(validateExpiryMonth('')).toBe('Required');
    expect(validateExpiryMonth('01')).toBe('');
  });

  it('requires year', () => {
    expect(validateExpiryYear('')).toBe('Required');
    expect(validateExpiryYear('30')).toBe('');
  });
});

describe('validateExpiry', () => {
  it('returns empty when month or year missing', () => {
    expect(validateExpiry('', '30')).toBe('');
    expect(validateExpiry('01', '')).toBe('');
  });

  it('detects expired card', () => {
    expect(validateExpiry('01', '20')).toBe('Card has expired');
  });

  it('accepts future date', () => {
    expect(validateExpiry('12', '99')).toBe('');
  });
});

describe('validateCvv', () => {
  it('requires value', () => {
    expect(validateCvv('')).toBe('Required');
  });

  it('accepts 3-4 digits', () => {
    expect(validateCvv('123')).toBe('');
    expect(validateCvv('1234')).toBe('');
  });

  it('rejects wrong length', () => {
    expect(validateCvv('12')).toBe('3-4 digits');
    expect(validateCvv('12345')).toBe('3-4 digits');
  });
});

describe('validateIban', () => {
  it('rejects empty', () => {
    expect(validateIban('')).toBe('This field is required');
  });

  it('rejects invalid format', () => {
    expect(validateIban('123')).toContain('Invalid IBAN format');
  });

  it('rejects too short', () => {
    expect(validateIban('TR33000')).toContain('15-34');
  });

  it('accepts valid IBAN', () => {
    expect(validateIban('TR330006100519786457841326')).toBe('');
  });
});

describe('validateSwift', () => {
  it('accepts empty (optional)', () => {
    expect(validateSwift('')).toBe('');
  });

  it('accepts 8-char SWIFT', () => {
    expect(validateSwift('AKBATRIS')).toBe('');
  });

  it('accepts 11-char SWIFT', () => {
    expect(validateSwift('AKBATRISXXX')).toBe('');
  });

  it('rejects wrong length', () => {
    expect(validateSwift('AKBA')).toContain('8 or 11');
  });
});

describe('validateEmail', () => {
  it('accepts empty (optional)', () => {
    expect(validateEmail('')).toBe('');
  });

  it('accepts valid email', () => {
    expect(validateEmail('test@example.com')).toBe('');
  });

  it('rejects invalid email', () => {
    expect(validateEmail('not-an-email')).toBe('Invalid email format');
  });
});

describe('validatePhone', () => {
  it('accepts empty (optional)', () => {
    expect(validatePhone('')).toBe('');
  });

  it('accepts valid phone', () => {
    expect(validatePhone('555 123 4567')).toBe('');
  });

  it('rejects too short', () => {
    expect(validatePhone('123')).toBe('Too short');
  });

  it('rejects too long', () => {
    expect(validatePhone('1234567890123456')).toBe('Too long');
  });
});

describe('validateDateOfBirth', () => {
  it('accepts empty (optional)', () => {
    expect(validateDateOfBirth('')).toBe('');
    expect(validateDateOfBirth('//')).toBe('');
    expect(validateDateOfBirth('/')).toBe('');
  });

  it('rejects incomplete date', () => {
    expect(validateDateOfBirth('15//')).toBe('Incomplete date');
    expect(validateDateOfBirth('15/06/')).toBe('Incomplete date');
  });

  it('rejects invalid month', () => {
    expect(validateDateOfBirth('15/13/1990')).toBe('Invalid month');
  });

  it('rejects invalid day', () => {
    expect(validateDateOfBirth('32/01/1990')).toBe('Invalid day');
  });

  it('rejects impossible date (e.g. Feb 30)', () => {
    expect(validateDateOfBirth('30/02/1990')).toBe('Invalid date');
  });

  it('rejects future date', () => {
    expect(validateDateOfBirth('01/01/2099')).toBe('Cannot be in the future');
  });

  it('rejects year before 1900', () => {
    expect(validateDateOfBirth('01/01/1899')).toBe('Invalid year');
  });

  it('accepts valid date', () => {
    expect(validateDateOfBirth('15/06/1990')).toBe('');
  });
});

describe('validateUrl', () => {
  it('accepts empty (optional)', () => {
    expect(validateUrl('')).toBe('');
  });

  it('accepts valid URL', () => {
    expect(validateUrl('https://example.com')).toBe('');
  });

  it('auto-prepends https://', () => {
    expect(validateUrl('example.com')).toBe('');
  });

  it('rejects invalid URL', () => {
    expect(validateUrl('not a url at all!!')).toBe('Invalid URL');
  });
});

// ── Per-type validation ─────────────────────────────────────────────

describe('validateVaultFields', () => {
  it('validates card type — all fields required', () => {
    const errors = validateVaultFields('card', {});
    expect(errors.cardholderName).toBeTruthy();
    expect(errors.cardNumber).toBeTruthy();
    expect(errors.expiryMonth).toBeTruthy();
    expect(errors.expiryYear).toBeTruthy();
    expect(errors.cvv).toBeTruthy();
  });

  it('validates card type — valid data', () => {
    const errors = validateVaultFields('card', {
      cardholderName: 'John Doe',
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '99',
      cvv: '123',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('validates bank type — required fields', () => {
    const errors = validateVaultFields('bank', {});
    expect(errors.bankName).toBeTruthy();
    expect(errors.accountHolder).toBeTruthy();
    expect(errors.iban).toBeTruthy();
  });

  it('validates bank type — valid data', () => {
    const errors = validateVaultFields('bank', {
      bankName: 'Test Bank',
      accountHolder: 'John Doe',
      iban: 'TR330006100519786457841326',
      swift: 'AKBATRIS',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('validates address type — required fields', () => {
    const errors = validateVaultFields('address', {});
    expect(errors.street).toBeTruthy();
    expect(errors.city).toBeTruthy();
    expect(errors.country).toBeTruthy();
  });

  it('validates address type — valid data', () => {
    const errors = validateVaultFields('address', {
      street: '123 Main St',
      city: 'Istanbul',
      country: 'Turkey',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('validates personal type — required + optional fields', () => {
    const errors = validateVaultFields('personal', {});
    expect(errors.firstName).toBeTruthy();
    expect(errors.lastName).toBeTruthy();
    // email and phone are optional — no error when empty
    expect(errors.email).toBeUndefined();
    expect(errors.phone).toBeUndefined();
  });

  it('validates personal type — with invalid optional fields', () => {
    const errors = validateVaultFields('personal', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'not-email',
      phone: '123',
    });
    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeTruthy();
  });

  it('validates personal type — with DOB', () => {
    const errors = validateVaultFields('personal', {
      firstName: 'John',
      lastName: 'Doe',
      dobDay: '30',
      dobMonth: '02',
      dobYear: '1990',
    });
    expect(errors.dateOfBirth).toBeTruthy(); // Feb 30 is invalid
  });

  it('validates company type — required fields', () => {
    const errors = validateVaultFields('company', {});
    expect(errors.companyName).toBeTruthy();
  });

  it('validates company type — short taxId', () => {
    const errors = validateVaultFields('company', {
      companyName: 'ACME Corp',
      taxId: '123',
    });
    expect(errors.taxId).toContain('5 characters');
  });

  it('validates company type — valid data with optional fields', () => {
    const errors = validateVaultFields('company', {
      companyName: 'ACME Corp',
      taxId: '12345',
      website: 'https://acme.com',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('validates code type — required', () => {
    const errors = validateVaultFields('code', {});
    expect(errors.code).toBeTruthy();
  });

  it('validates code type — valid', () => {
    const errors = validateVaultFields('code', { code: '1234' });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
