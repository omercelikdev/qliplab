import type { VaultItemType } from '@/types/vault';

// ── Formatters ──────────────────────────────────────────────────────

export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function unformatCardNumber(formatted: string): string {
  return formatted.replace(/\s/g, '');
}

export function formatIban(raw: string): string {
  const clean = raw.replace(/\s/g, '').toUpperCase().slice(0, 34);
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

export function unformatIban(formatted: string): string {
  return formatted.replace(/\s/g, '');
}

export function formatSwift(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11);
}

export function formatCvv(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4);
}

export function formatPhoneNumber(raw: string): string {
  return raw.replace(/[^\d\s-]/g, '');
}

// ── Validators ──────────────────────────────────────────────────────

export function validateRequired(value: string, minLen = 1): string {
  const trimmed = value.trim();
  if (!trimmed) return 'This field is required';
  if (trimmed.length < minLen) return `Minimum ${minLen} characters`;
  return '';
}

export function validateLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(value: string): string {
  const digits = unformatCardNumber(value);
  if (!digits) return 'This field is required';
  if (!/^\d+$/.test(digits)) return 'Only digits allowed';
  if (digits.length < 13 || digits.length > 16) return 'Must be 13-16 digits';
  if (!validateLuhn(digits)) return 'Invalid card number';
  return '';
}

export function validateExpiryMonth(value: string): string {
  if (!value) return 'Required';
  return '';
}

export function validateExpiryYear(value: string): string {
  if (!value) return 'Required';
  return '';
}

export function validateExpiry(month: string, year: string): string {
  if (!month || !year) return '';
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (y < currentYear || (y === currentYear && m < currentMonth)) {
    return 'Card has expired';
  }
  return '';
}

export function validateCvv(value: string): string {
  if (!value) return 'Required';
  if (!/^\d{3,4}$/.test(value)) return '3-4 digits';
  return '';
}

export function validateIban(value: string): string {
  const clean = unformatIban(value);
  if (!clean) return 'This field is required';
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return 'Invalid IBAN format';
  if (clean.length < 15 || clean.length > 34) return 'IBAN must be 15-34 characters';
  return '';
}

export function validateSwift(value: string): string {
  if (!value) return '';
  if (!/^[A-Z0-9]{8}$|^[A-Z0-9]{11}$/.test(value.toUpperCase())) {
    return 'Must be 8 or 11 characters';
  }
  return '';
}

export function validateEmail(value: string): string {
  if (!value) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
  return '';
}

export function validatePhone(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return 'Too short';
  if (digits.length > 15) return 'Too long';
  return '';
}

export function validateDateOfBirth(value: string): string {
  // DOB comes as DD/MM/YYYY from 3 selects — partial is OK (optional field)
  if (!value || value === '//' || value === '/') return '';
  const parts = value.split('/');
  if (parts.length !== 3) return 'Incomplete date';
  const [d, m, y] = parts;
  // All 3 parts must be filled or all empty
  if (!d && !m && !y) return '';
  if (!d || !m || !y) return 'Incomplete date';
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  const year = parseInt(y, 10);
  if (month < 1 || month > 12) return 'Invalid month';
  if (day < 1 || day > 31) return 'Invalid day';
  const date = new Date(year, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return 'Invalid date';
  }
  if (date > new Date()) return 'Cannot be in the future';
  if (year < 1900) return 'Invalid year';
  return '';
}

export function validateUrl(value: string): string {
  if (!value) return '';
  try {
    const url = value.startsWith('http') ? value : `https://${value}`;
    new URL(url);
    return '';
  } catch {
    return 'Invalid URL';
  }
}

// ── Per-type validation ─────────────────────────────────────────────

export function validateVaultFields(
  type: VaultItemType,
  data: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const v = (field: string) => (data[field] || '').trim();

  switch (type) {
    case 'card': {
      const e = (f: string, msg: string) => { if (msg) errors[f] = msg; };
      e('cardholderName', validateRequired(v('cardholderName'), 2));
      e('cardNumber', validateCardNumber(v('cardNumber')));
      e('expiryMonth', validateExpiryMonth(v('expiryMonth')));
      e('expiryYear', validateExpiryYear(v('expiryYear')));
      e('cvv', validateCvv(v('cvv')));
      const expiryErr = validateExpiry(v('expiryMonth'), v('expiryYear'));
      if (expiryErr && !errors.expiryMonth && !errors.expiryYear) {
        errors.expiryYear = expiryErr;
      }
      break;
    }
    case 'bank': {
      const e = (f: string, msg: string) => { if (msg) errors[f] = msg; };
      e('bankName', validateRequired(v('bankName'), 2));
      e('accountHolder', validateRequired(v('accountHolder'), 2));
      e('iban', validateIban(v('iban')));
      e('swift', validateSwift(v('swift')));
      break;
    }
    case 'address': {
      const e = (f: string, msg: string) => { if (msg) errors[f] = msg; };
      e('street', validateRequired(v('street'), 3));
      e('city', validateRequired(v('city'), 2));
      e('country', validateRequired(v('country'), 2));
      break;
    }
    case 'personal': {
      const e = (f: string, msg: string) => { if (msg) errors[f] = msg; };
      e('firstName', validateRequired(v('firstName'), 2));
      e('lastName', validateRequired(v('lastName'), 2));
      e('email', validateEmail(v('email')));
      e('phone', validatePhone(v('phone')));
      // Build DOB from parts
      const dobDay = v('dobDay');
      const dobMonth = v('dobMonth');
      const dobYear = v('dobYear');
      if (dobDay || dobMonth || dobYear) {
        const dob = `${dobDay}/${dobMonth}/${dobYear}`;
        e('dateOfBirth', validateDateOfBirth(dob));
      }
      break;
    }
    case 'company': {
      const e = (f: string, msg: string) => { if (msg) errors[f] = msg; };
      e('companyName', validateRequired(v('companyName'), 2));
      if (v('taxId') && v('taxId').length < 5) errors.taxId = 'Minimum 5 characters';
      e('website', validateUrl(v('website')));
      break;
    }
    case 'code': {
      if (!v('code')) errors.code = 'This field is required';
      break;
    }
  }

  return errors;
}
