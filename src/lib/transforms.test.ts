import { describe, it, expect } from 'vitest';
import {
  beautifyJson, minifyJson, validateJson,
  encodeBase64, decodeBase64,
  encodeUrl, decodeUrl,
  decodeJwt,
  formatSql,
  toUpperCase, toLowerCase, toCamelCase, toSnakeCase,
} from './transforms';

// ─── Test 3: JSON Transforms ─────────────────────────────────

describe('JSON transforms', () => {
  it('beautifies JSON', () => {
    const result = beautifyJson('{"a":1,"b":2}');
    expect(result).toContain('  "a": 1');
    expect(result).toContain('  "b": 2');
  });

  it('minifies JSON', () => {
    expect(minifyJson('{\n  "a": 1,\n  "b": 2\n}')).toBe('{"a":1,"b":2}');
  });

  it('validates correct JSON', () => {
    expect(validateJson('{"a":1}').valid).toBe(true);
  });

  it('invalidates bad JSON', () => {
    const result = validateJson('{bad}');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns original on invalid input', () => {
    expect(beautifyJson('not json')).toBe('not json');
    expect(minifyJson('not json')).toBe('not json');
  });
});

// ─── Test 4: Base64 Transforms ───────────────────────────────

describe('Base64 transforms', () => {
  it('encodes ASCII text', () => {
    expect(encodeBase64('Hello World')).toBe('SGVsbG8gV29ybGQ=');
  });

  it('decodes ASCII text', () => {
    expect(decodeBase64('SGVsbG8gV29ybGQ=')).toBe('Hello World');
  });

  it('roundtrips ASCII', () => {
    const input = 'Test string 123!';
    expect(decodeBase64(encodeBase64(input))).toBe(input);
  });

  it('handles Unicode', () => {
    const input = 'Merhaba dünya! 🌍';
    expect(decodeBase64(encodeBase64(input))).toBe(input);
  });

  it('returns original on invalid base64', () => {
    expect(decodeBase64('!!!invalid!!!')).toBe('!!!invalid!!!');
  });
});

// ─── Test 5: URL Transforms ─────────────────────────────────

describe('URL transforms', () => {
  it('encodes special characters', () => {
    expect(encodeUrl('hello world&foo=bar')).toBe('hello%20world%26foo%3Dbar');
  });

  it('decodes encoded string', () => {
    expect(decodeUrl('hello%20world%26foo%3Dbar')).toBe('hello world&foo=bar');
  });

  it('roundtrips URL encoding', () => {
    const input = 'key=value&name=ömer çelik';
    expect(decodeUrl(encodeUrl(input))).toBe(input);
  });
});

// ─── Test 6: JWT Decode ──────────────────────────────────────

describe('JWT decode', () => {
  it('decodes a valid JWT', () => {
    // Header: {"alg":"HS256"}, Payload: {"sub":"1234567890"}
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const decoded = decodeJwt(jwt);
    expect(decoded).not.toBeNull();
    expect(decoded!.header.alg).toBe('HS256');
    expect(decoded!.payload.sub).toBe('1234567890');
  });

  it('returns null for invalid JWT', () => {
    expect(decodeJwt('not.a.jwt')).toBeNull();
    expect(decodeJwt('only-one-part')).toBeNull();
  });
});

// ─── Test 7: SQL Format ──────────────────────────────────────

describe('SQL format', () => {
  it('formats SELECT statement', () => {
    const result = formatSql('SELECT id, name FROM users WHERE active = 1');
    expect(result).toContain('SELECT');
    expect(result).toContain('\nFROM');
    expect(result).toContain('\nWHERE');
  });
});

// ─── Test 8: Case Transforms ─────────────────────────────────

describe('Case transforms', () => {
  it('converts to uppercase', () => {
    expect(toUpperCase('hello world')).toBe('HELLO WORLD');
  });

  it('converts to lowercase', () => {
    expect(toLowerCase('HELLO WORLD')).toBe('hello world');
  });

  it('converts to camelCase', () => {
    expect(toCamelCase('hello world')).toBe('helloWorld');
    expect(toCamelCase('my-variable-name')).toBe('myVariableName');
  });

  it('converts to snake_case', () => {
    expect(toSnakeCase('helloWorld')).toBe('hello_world');
    expect(toSnakeCase('MyComponent')).toBe('my_component');
  });
});
