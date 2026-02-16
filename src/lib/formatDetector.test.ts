import { describe, it, expect } from 'vitest';
import { detectFormat, isSensitive } from './formatDetector';

// ─── Test 1: Format Detection ────────────────────────────────

describe('detectFormat', () => {
  it('detects valid JSON object', () => {
    expect(detectFormat('{"name":"test","value":1}')).toBe('json');
  });

  it('detects valid JSON array', () => {
    expect(detectFormat('[1,2,3]')).toBe('json');
  });

  it('does not falsely detect invalid JSON', () => {
    expect(detectFormat('{not json}')).not.toBe('json');
  });

  it('detects JWT token', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(detectFormat(jwt)).toBe('jwt');
  });

  it('detects UUID', () => {
    expect(detectFormat('550e8400-e29b-41d4-a716-446655440000')).toBe('uuid');
  });

  it('detects URL', () => {
    expect(detectFormat('https://example.com/path?q=1')).toBe('url');
  });

  it('detects URL-encoded string', () => {
    expect(detectFormat('hello%20world%21')).toBe('url_encoded');
  });

  it('detects Base64', () => {
    expect(detectFormat('SGVsbG8gV29ybGQgdGhpcyBpcyBhIHRlc3Q=')).toBe('base64');
  });

  it('detects SQL', () => {
    expect(detectFormat('SELECT * FROM users WHERE id = 1')).toBe('sql');
    expect(detectFormat('INSERT INTO users (name) VALUES ("test")')).toBe('sql');
  });

  it('detects Unix timestamp (seconds)', () => {
    expect(detectFormat('1708099200')).toBe('timestamp');
  });

  it('detects Unix timestamp (milliseconds)', () => {
    expect(detectFormat('1708099200000')).toBe('timestamp');
  });

  it('detects HEX color', () => {
    expect(detectFormat('#FF5733')).toBe('color');
    expect(detectFormat('#fff')).toBe('color');
  });

  it('detects RGB color', () => {
    expect(detectFormat('rgb(255, 87, 51)')).toBe('color');
  });

  it('detects HSL color', () => {
    expect(detectFormat('hsl(11, 100%, 60%)')).toBe('color');
  });

  it('detects hex string', () => {
    expect(detectFormat('0xDEADBEEF')).toBe('hex');
    expect(detectFormat('DEADBEEF01')).toBe('hex');
  });

  it('detects CSV', () => {
    expect(detectFormat('name,age,city\nJohn,30,NYC\nJane,25,LA')).toBe('csv');
  });

  it('detects regex', () => {
    expect(detectFormat('/^hello\\s+world$/gi')).toBe('regex');
  });

  it('detects markdown', () => {
    const md = '# Title\n\nSome **bold** text\n\n- item 1\n- item 2';
    expect(detectFormat(md)).toBe('markdown');
  });

  it('detects JavaScript code', () => {
    expect(detectFormat('const x = 42;')).toBe('code_js');
    expect(detectFormat('function hello() {')).toBe('code_js');
  });

  it('detects TypeScript code', () => {
    expect(detectFormat('interface User { name: string; }')).toBe('code_ts');
  });

  it('detects Python code', () => {
    expect(detectFormat('def hello():\n    print("hi")')).toBe('code_python');
  });

  it('detects Rust code', () => {
    expect(detectFormat('fn main() {\n    println!("hi");\n}')).toBe('code_rust');
  });

  it('returns plain for regular text', () => {
    expect(detectFormat('Hello, this is just a sentence.')).toBe('plain');
  });
});

// ─── Test 2: Sensitive Data Detection ────────────────────────

describe('isSensitive', () => {
  it('detects password patterns', () => {
    expect(isSensitive('password: mySecret123')).toBe(true);
    expect(isSensitive('password=hunter2')).toBe(true);
  });

  it('detects API key patterns', () => {
    expect(isSensitive('api_key: abc123def456')).toBe(true);
    expect(isSensitive('api-key=xyz')).toBe(true);
  });

  it('detects secret patterns', () => {
    expect(isSensitive('secret: my_secret_value')).toBe(true);
    expect(isSensitive('client_secret=abc')).toBe(true);
  });

  it('detects credit card numbers', () => {
    expect(isSensitive('4532 1234 5678 9012')).toBe(true);
    expect(isSensitive('4532-1234-5678-9012')).toBe(true);
  });

  it('detects OpenAI API keys', () => {
    expect(isSensitive('sk-proj-abcdefghijklmnopqrstuvwx')).toBe(true);
  });

  it('detects Anthropic API keys', () => {
    expect(isSensitive('sk-ant-api03-abcdefghijklmnopqrstuvwx')).toBe(true);
  });

  it('detects GitHub tokens', () => {
    expect(isSensitive('ghp_1234567890abcdefghijklmnopqrstuvwxyz')).toBe(true);
  });

  it('detects AWS access keys', () => {
    expect(isSensitive('AKIAIOSFODNN7EXAMPLE')).toBe(true);
  });

  it('detects PEM private keys', () => {
    expect(isSensitive('-----BEGIN RSA PRIVATE KEY-----\nMIIE...')).toBe(true);
    expect(isSensitive('-----BEGIN PRIVATE KEY-----\nMIIE...')).toBe(true);
  });

  it('detects CVV/PIN', () => {
    expect(isSensitive('CVV: 123')).toBe(true);
    expect(isSensitive('PIN: 4567')).toBe(true);
  });

  it('does NOT flag normal text', () => {
    expect(isSensitive('Hello, this is a normal sentence.')).toBe(false);
    expect(isSensitive('The weather is nice today.')).toBe(false);
  });

  it('does NOT flag normal code', () => {
    expect(isSensitive('const x = 42; console.log(x);')).toBe(false);
  });
});
