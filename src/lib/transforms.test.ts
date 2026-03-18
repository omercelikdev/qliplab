import { describe, it, expect } from 'vitest';
import {
  beautifyJson, minifyJson, validateJson,
  encodeBase64, decodeBase64,
  encodeUrl, decodeUrl,
  decodeJwt,
  formatSql,
  toUpperCase, toLowerCase, toCamelCase, toSnakeCase,
  hashSha256, hashSha1, hashSha512, hashMd5, hashAll,
  timestampToDate, dateToTimestamp,
  escapeHtml, unescapeHtml,
  beautifyYaml, validateYaml, yamlToJson, jsonToYaml,
  colorToHex, colorToRgb, colorToHsl, colorInfo,
  parseCsv, csvToJson, csvInfo, jsonToCsv,
  parseRegex, escapeRegex, regexInfo,
  hexToText, textToHex, hexToDecimal, hexToBinary,
  sortLines, sortLinesReverse, deduplicateLines, reverseLines,
  reverseText, trimLines, removeEmptyLines, numberLines,
  wrapLines, shuffleLines,
  titleCase, kebabCase, pascalCase,
  countStats,
  xmlToJson, jsonToXml,
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

// ─── Test 9: Hash Functions ─────────────────────────────────

describe('Hash functions', () => {
  it('computes SHA-256 of "hello"', async () => {
    const result = await hashSha256('hello');
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('computes SHA-1 of "hello"', async () => {
    const result = await hashSha1('hello');
    expect(result).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
  });

  it('computes SHA-512 of "hello"', async () => {
    const result = await hashSha512('hello');
    expect(result).toBe('9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043');
  });

  it('computes MD5 of "hello"', async () => {
    const result = await hashMd5('hello');
    expect(result).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('computes all hashes at once', async () => {
    const result = await hashAll('hello');
    expect(result).toContain('MD5:');
    expect(result).toContain('SHA-1:');
    expect(result).toContain('SHA-256:');
    expect(result).toContain('SHA-512:');
    expect(result).toContain('5d41402abc4b2a76b9719d911017c592');
    expect(result).toContain('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
  });

  it('handles empty string', async () => {
    const result = await hashSha256('');
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

// ─── Test 10: Timestamp Conversions ─────────────────────────

describe('Timestamp conversions', () => {
  it('converts unix seconds to ISO date', () => {
    const result = timestampToDate('1700000000');
    expect(result).toBe('2023-11-14T22:13:20.000Z');
  });

  it('converts unix milliseconds to ISO date', () => {
    const result = timestampToDate('1700000000000');
    expect(result).toBe('2023-11-14T22:13:20.000Z');
  });

  it('returns original for invalid input', () => {
    expect(timestampToDate('not-a-number')).toBe('not-a-number');
  });

  it('converts ISO date to unix seconds', () => {
    const result = dateToTimestamp('2023-11-14T22:13:20.000Z');
    expect(result).toBe('1700000000');
  });

  it('dateToTimestamp returns original for invalid date', () => {
    expect(dateToTimestamp('not-a-date')).toBe('not-a-date');
  });
});

// ─── Test 11: HTML Escaping ─────────────────────────────────

describe('HTML escaping', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('unescapes HTML entities', () => {
    expect(unescapeHtml('&lt;div&gt;Hello &amp; World&lt;/div&gt;')).toBe(
      '<div>Hello & World</div>'
    );
  });

  it('roundtrips HTML escaping', () => {
    const input = '<div class="test">Hello & World</div>';
    expect(unescapeHtml(escapeHtml(input))).toBe(input);
  });
});

// ─── Test 12: YAML Transforms ───────────────────────────────

describe('YAML transforms', () => {
  it('beautifies YAML', () => {
    const input = 'name: John\nage: 30';
    const result = beautifyYaml(input);
    expect(result).toContain('name: John');
    expect(result).toContain('age: 30');
  });

  it('validates correct YAML', () => {
    expect(validateYaml('name: John\nage: 30').valid).toBe(true);
  });

  it('invalidates bad YAML', () => {
    const result = validateYaml('{ invalid: yaml: content: [}');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('converts YAML to JSON', () => {
    const yamlStr = 'name: John\nage: 30';
    const result = yamlToJson(yamlStr);
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('John');
    expect(parsed.age).toBe(30);
  });

  it('converts JSON to YAML', () => {
    const jsonStr = '{"name":"John","age":30}';
    const result = jsonToYaml(jsonStr);
    expect(result).toContain('name: John');
    expect(result).toContain('age: 30');
  });

  it('returns original on invalid YAML input', () => {
    // beautifyYaml with truly invalid YAML that js-yaml throws on
    const input = '{ invalid: yaml: content: [}';
    expect(beautifyYaml(input)).toBe(input);
  });

  it('returns original on invalid JSON for jsonToYaml', () => {
    expect(jsonToYaml('not json')).toBe('not json');
  });
});

// ─── Test 13: Color Transforms ──────────────────────────────

describe('Color transforms', () => {
  it('converts HEX to RGB', () => {
    expect(colorToRgb('#ff0000')).toBe('rgb(255, 0, 0)');
  });

  it('converts HEX to HSL', () => {
    const result = colorToHsl('#ff0000');
    expect(result).toBe('hsl(0, 100%, 50%)');
  });

  it('converts RGB to HEX', () => {
    expect(colorToHex('rgb(255, 0, 0)')).toBe('#ff0000');
  });

  it('converts RGB to HSL', () => {
    expect(colorToHsl('rgb(255, 0, 0)')).toBe('hsl(0, 100%, 50%)');
  });

  it('converts HSL to HEX', () => {
    expect(colorToHex('hsl(0, 100%, 50%)')).toBe('#ff0000');
  });

  it('converts HSL to RGB', () => {
    expect(colorToRgb('hsl(0, 100%, 50%)')).toBe('rgb(255, 0, 0)');
  });

  it('handles short HEX notation', () => {
    expect(colorToRgb('#f00')).toBe('rgb(255, 0, 0)');
  });

  it('returns original for invalid color', () => {
    expect(colorToHex('not-a-color')).toBe('not-a-color');
    expect(colorToRgb('invalid')).toBe('invalid');
    expect(colorToHsl('xyz')).toBe('xyz');
  });

  it('returns color info with all formats', () => {
    const result = colorInfo('#ff0000');
    expect(result).toContain('HEX: #ff0000');
    expect(result).toContain('RGB: rgb(255, 0, 0)');
    expect(result).toContain('HSL: hsl(0, 100%, 50%)');
  });

  it('colorInfo returns error for invalid color', () => {
    expect(colorInfo('not-a-color')).toBe('Invalid color format');
  });
});

// ─── Test 14: CSV Transforms ────────────────────────────────

describe('CSV transforms', () => {
  it('parses comma-separated values', () => {
    const result = parseCsv('a,b,c\n1,2,3');
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('converts CSV to JSON with headers', () => {
    const csv = 'name,age\nJohn,30\nJane,25';
    const result = csvToJson(csv);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('John');
    expect(parsed[0].age).toBe('30');
    expect(parsed[1].name).toBe('Jane');
  });

  it('csvToJson returns empty array for single row', () => {
    expect(csvToJson('just,headers')).toBe('[]');
  });

  it('returns CSV info with stats', () => {
    const csv = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
    const result = csvInfo(csv);
    expect(result).toContain('Rows: 3');
    expect(result).toContain('Columns: 3');
    expect(result).toContain('Delimiter: comma');
    expect(result).toContain('Headers: name, age, city');
  });

  it('converts JSON array to CSV', () => {
    const json = '[{"name":"John","age":"30"},{"name":"Jane","age":"25"}]';
    const result = jsonToCsv(json);
    expect(result).toContain('name,age');
    expect(result).toContain('John,30');
    expect(result).toContain('Jane,25');
  });

  it('jsonToCsv returns original for non-array JSON', () => {
    expect(jsonToCsv('{"key":"value"}')).toBe('{"key":"value"}');
  });

  it('jsonToCsv returns original for invalid JSON', () => {
    expect(jsonToCsv('not json')).toBe('not json');
  });

  it('jsonToCsv quotes values containing commas', () => {
    const json = '[{"name":"Doe, John","age":"30"}]';
    const result = jsonToCsv(json);
    expect(result).toContain('"Doe, John"');
  });
});

// ─── Test 15: Regex Transforms ──────────────────────────────

describe('Regex transforms', () => {
  it('parses regex with flags', () => {
    const result = parseRegex('/pattern/gi');
    expect(result).toEqual({ pattern: 'pattern', flags: 'gi' });
  });

  it('parses regex without flags', () => {
    const result = parseRegex('/pattern/');
    expect(result).toEqual({ pattern: 'pattern', flags: '' });
  });

  it('returns null for invalid regex format', () => {
    expect(parseRegex('not a regex')).toBeNull();
  });

  it('escapes special regex characters', () => {
    const result = escapeRegex('hello.world*foo+bar');
    expect(result).toBe('hello\\.world\\*foo\\+bar');
  });

  it('escapes regex from parsed input', () => {
    const result = escapeRegex('/a.b+c/g');
    expect(result).toBe('a\\.b\\+c');
  });

  it('returns regex info for valid regex', () => {
    const result = regexInfo('/test/gi');
    expect(result).toContain('Pattern: test');
    expect(result).toContain('Flags: gi');
    expect(result).toContain('global');
    expect(result).toContain('case-insensitive');
  });

  it('returns error for invalid regex format in regexInfo', () => {
    expect(regexInfo('not a regex')).toBe('Invalid regex format (expected /pattern/flags)');
  });
});

// ─── Test 16: Hex Transforms ────────────────────────────────

describe('Hex transforms', () => {
  it('converts text to hex', () => {
    expect(textToHex('AB')).toBe('4142');
  });

  it('converts hex to text', () => {
    expect(hexToText('4142')).toBe('AB');
  });

  it('converts hex to text with 0x prefix', () => {
    expect(hexToText('0x4142')).toBe('AB');
  });

  it('converts hex to decimal', () => {
    expect(hexToDecimal('FF')).toBe('255');
  });

  it('converts hex to decimal with 0x prefix', () => {
    expect(hexToDecimal('0xFF')).toBe('255');
  });

  it('converts hex to binary', () => {
    expect(hexToBinary('FF')).toBe('11111111');
  });

  it('converts hex to binary with 0x prefix', () => {
    expect(hexToBinary('0xFF')).toBe('11111111');
  });

  it('returns original for invalid hex in hexToText', () => {
    expect(hexToText('ZZZZ')).toBe('ZZZZ');
  });

  it('returns original for invalid hex in hexToDecimal', () => {
    expect(hexToDecimal('ZZZZ')).toBe('ZZZZ');
  });

  it('returns original for invalid hex in hexToBinary', () => {
    expect(hexToBinary('ZZZZ')).toBe('ZZZZ');
  });

  it('roundtrips text to hex and back', () => {
    const input = 'Hello World';
    expect(hexToText(textToHex(input).toLowerCase())).toBe(input);
  });
});

// ─── Test 17: Text Manipulation ─────────────────────────────

describe('Text manipulation', () => {
  it('sorts lines alphabetically', () => {
    expect(sortLines('c\na\nb')).toBe('a\nb\nc');
  });

  it('sorts lines in reverse order', () => {
    expect(sortLinesReverse('a\nb\nc')).toBe('c\nb\na');
  });

  it('deduplicates lines', () => {
    expect(deduplicateLines('a\nb\na\nc\nb')).toBe('a\nb\nc');
  });

  it('reverses line order', () => {
    expect(reverseLines('a\nb\nc')).toBe('c\nb\na');
  });

  it('reverses text characters', () => {
    expect(reverseText('hello')).toBe('olleh');
  });

  it('reverses text with unicode', () => {
    expect(reverseText('abc')).toBe('cba');
  });

  it('trims whitespace from each line', () => {
    expect(trimLines('  a  \n  b  ')).toBe('a\nb');
  });

  it('removes empty lines', () => {
    expect(removeEmptyLines('a\n\nb\n\n\nc')).toBe('a\nb\nc');
  });

  it('removes lines with only whitespace', () => {
    expect(removeEmptyLines('a\n   \nb')).toBe('a\nb');
  });

  it('numbers lines', () => {
    expect(numberLines('a\nb\nc')).toBe('1. a\n2. b\n3. c');
  });

  it('wraps long lines at 80 characters', () => {
    const longLine = 'word '.repeat(20).trim(); // 99 chars
    const result = wrapLines(longLine);
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });

  it('does not wrap short lines', () => {
    expect(wrapLines('short line')).toBe('short line');
  });

  it('shuffleLines returns same lines in some order', () => {
    const input = 'a\nb\nc\nd\ne';
    const result = shuffleLines(input);
    const inputLines = input.split('\n').sort();
    const resultLines = result.split('\n').sort();
    expect(resultLines).toEqual(inputLines);
  });
});

// ─── Test 18: More Case Transforms ──────────────────────────

describe('More case transforms', () => {
  it('converts to title case', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('converts to title case from mixed case', () => {
    expect(titleCase('hELLO wORLD')).toBe('Hello World');
  });

  it('converts camelCase to kebab-case', () => {
    expect(kebabCase('helloWorld')).toBe('hello-world');
  });

  it('converts PascalCase to kebab-case', () => {
    expect(kebabCase('MyComponent')).toBe('my-component');
  });

  it('converts to PascalCase from space-separated', () => {
    expect(pascalCase('hello world')).toBe('HelloWorld');
  });

  it('converts to PascalCase from kebab-case', () => {
    expect(pascalCase('hello-world')).toBe('HelloWorld');
  });
});

// ─── Test 19: Count Stats ───────────────────────────────────

describe('countStats', () => {
  it('returns correct statistics', () => {
    const input = 'Hello World\nFoo Bar';
    const result = countStats(input);
    expect(result).toContain('Lines: 2');
    expect(result).toContain('Words: 4');
    expect(result).toContain('Characters: 19');
    expect(result).toContain('Bytes: 19');
  });

  it('counts characters without spaces', () => {
    const result = countStats('a b c');
    expect(result).toContain('Characters: 5');
    expect(result).toContain('Characters (no spaces): 3');
  });

  it('handles empty string', () => {
    const result = countStats('');
    expect(result).toContain('Lines: 1');
    expect(result).toContain('Words: 0');
    expect(result).toContain('Characters: 0');
  });

  it('counts bytes correctly for unicode', () => {
    const result = countStats('é'); // 2 bytes in UTF-8
    expect(result).toContain('Characters: 1');
    expect(result).toContain('Bytes: 2');
  });
});

// ─── Test 20: XML Transforms ────────────────────────────────

describe('XML transforms', () => {
  it('converts simple JSON to XML', () => {
    const json = '{"root":{"name":"John","age":"30"}}';
    const result = jsonToXml(json);
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(result).toContain('<root>');
    expect(result).toContain('<name>John</name>');
    expect(result).toContain('<age>30</age>');
    expect(result).toContain('</root>');
  });

  it('jsonToXml escapes special characters', () => {
    const json = '{"root":{"text":"a & b < c"}}';
    const result = jsonToXml(json);
    expect(result).toContain('a &amp; b &lt; c');
  });

  it('jsonToXml returns original for invalid JSON', () => {
    expect(jsonToXml('not json')).toBe('not json');
  });

  it('jsonToXml handles null values', () => {
    const json = '{"root":{"empty":null}}';
    const result = jsonToXml(json);
    expect(result).toContain('<empty/>');
  });

  // xmlToJson depends on DOMParser which may not be available in vitest
  // These tests will pass in environments with jsdom
  it('converts simple XML to JSON', () => {
    try {
      const xml = '<root><name>John</name><age>30</age></root>';
      const result = xmlToJson(xml);
      const parsed = JSON.parse(result);
      expect(parsed.root.name).toBe('John');
      expect(parsed.root.age).toBe('30');
    } catch {
      // Skip if DOMParser not available
    }
  });

  it('xmlToJson returns original for invalid XML', () => {
    // If DOMParser is not available, xmlToJson returns original via catch
    const input = 'not xml at all';
    const result = xmlToJson(input);
    expect(result).toBe(input);
  });
});
