// JSON
export function beautifyJson(content: string): string {
  try { return JSON.stringify(JSON.parse(content), null, 2); } catch { return content; }
}

export function minifyJson(content: string): string {
  try { return JSON.stringify(JSON.parse(content)); } catch { return content; }
}

export function validateJson(content: string): { valid: boolean; error?: string } {
  try { JSON.parse(content); return { valid: true }; } catch (e) { return { valid: false, error: (e as Error).message }; }
}

// Base64 (with Unicode support)
export function encodeBase64(content: string): string {
  try {
    // Handle Unicode characters properly
    return btoa(encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  } catch { return content; }
}
export function decodeBase64(content: string): string {
  try {
    // Handle Unicode characters properly
    return decodeURIComponent(Array.from(atob(content), c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
  } catch {
    // Fallback to simple decode for ASCII
    try { return atob(content); } catch { return content; }
  }
}

// URL
export function encodeUrl(content: string): string { return encodeURIComponent(content); }
export function decodeUrl(content: string): string { try { return decodeURIComponent(content); } catch { return content; } }

// JWT
/**
 * Decode one JWT segment. Segments are base64**url** (`-`/`_`, no padding), not
 * plain base64, and hold UTF-8 bytes — `atob` alone rejects real tokens (any
 * byte hitting index 62/63) and mangles non-ASCII claims into Latin-1.
 */
function decodeJwtSegment(segment: string): string {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

export function decodeJwt(content: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  const parts = content.split('.');
  if (parts.length !== 3) return null;
  try {
    return {
      header: JSON.parse(decodeJwtSegment(parts[0])),
      payload: JSON.parse(decodeJwtSegment(parts[1])),
    };
  } catch { return null; }
}

// SQL Format
export function formatSql(content: string): string {
  return content
    .replace(/\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|GROUP BY|JOIN|INSERT|INTO|VALUES|UPDATE|SET|DELETE)\b/gi, (match) => '\n' + match.toUpperCase())
    .trim();
}

// Text Case
export function toUpperCase(content: string): string { return content.toUpperCase(); }
export function toLowerCase(content: string): string { return content.toLowerCase(); }
export function toCamelCase(content: string): string {
  return content.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
}
export function toSnakeCase(content: string): string {
  return content.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/\s+/g, '_');
}

// Hash
export async function hashSha256(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Timestamp
export function timestampToDate(content: string): string {
  // Trim first: a terminal copy of a 13-digit ms timestamp arrives as
  // "1700000000000\n" (length 14), which the raw-length check would treat as
  // seconds and multiply into the year 55000.
  const trimmed = content.trim();
  const ts = parseInt(trimmed);
  if (isNaN(ts)) return content;
  const date = new Date(trimmed.length === 13 ? ts : ts * 1000);
  if (isNaN(date.getTime())) return content;
  return date.toISOString();
}

// HTML
export function escapeHtml(content: string): string {
  return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function unescapeHtml(content: string): string {
  return content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

// YAML
import yaml from 'js-yaml';

export function beautifyYaml(content: string): string {
  try {
    const parsed = yaml.load(content);
    return yaml.dump(parsed, { indent: 2, lineWidth: -1 });
  } catch { return content; }
}

export function validateYaml(content: string): { valid: boolean; error?: string } {
  try { yaml.load(content); return { valid: true }; } catch (e) { return { valid: false, error: (e as Error).message }; }
}

export function yamlToJson(content: string): string {
  try {
    const parsed = yaml.load(content);
    return JSON.stringify(parsed, null, 2);
  } catch { return content; }
}

export function jsonToYaml(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return yaml.dump(parsed, { indent: 2, lineWidth: -1 });
  } catch { return content; }
}

// Color
interface ColorRGB { r: number; g: number; b: number; a?: number }
interface ColorHSL { h: number; s: number; l: number; a?: number }

function parseColor(content: string): ColorRGB | null {
  const trimmed = content.trim();

  // HEX
  const hexMatch = trimmed.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : undefined;
    return { r, g, b, a };
  }

  // RGB/RGBA
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : undefined
    };
  }

  // HSL/HSLA
  const hslMatch = trimmed.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]);
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;
    const a = hslMatch[4] ? parseFloat(hslMatch[4]) : undefined;
    // Convert HSL to RGB
    const rgb = hslToRgb(h, s, l);
    return { ...rgb, a };
  }

  return null;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function rgbToHsl(r: number, g: number, b: number): ColorHSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function colorToHex(content: string): string {
  const rgb = parseColor(content);
  if (!rgb) return content;
  const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
  return rgb.a !== undefined ? `${hex}${Math.round(rgb.a * 255).toString(16).padStart(2, '0')}` : hex;
}

export function colorToRgb(content: string): string {
  const rgb = parseColor(content);
  if (!rgb) return content;
  return rgb.a !== undefined
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`
    : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function colorToHsl(content: string): string {
  const rgb = parseColor(content);
  if (!rgb) return content;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return rgb.a !== undefined
    ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${rgb.a})`
    : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

export function colorInfo(content: string): string {
  const rgb = parseColor(content);
  if (!rgb) return 'Invalid color format';
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hex = colorToHex(content);

  return [
    `HEX: ${hex}`,
    `RGB: rgb(${rgb.r}, ${rgb.g}, ${rgb.b})${rgb.a !== undefined ? ` (alpha: ${rgb.a})` : ''}`,
    `HSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)${rgb.a !== undefined ? ` (alpha: ${rgb.a})` : ''}`,
  ].join('\n');
}

// CSV
function detectCsvDelimiter(content: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const firstLine = content.split('\n')[0];
  let bestDelimiter = ',';
  let maxCount = 0;

  for (const delimiter of delimiters) {
    const count = firstLine.split(delimiter).length - 1;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  return bestDelimiter;
}

export function parseCsv(content: string): string[][] {
  const delimiter = detectCsvDelimiter(content);
  return content.split('\n')
    .filter(line => line.trim())
    .map(line => line.split(delimiter).map(cell => cell.trim()));
}

export function csvToJson(content: string): string {
  const rows = parseCsv(content);
  if (rows.length < 2) return '[]';

  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });

  return JSON.stringify(data, null, 2);
}

export function csvInfo(content: string): string {
  const rows = parseCsv(content);
  const delimiter = detectCsvDelimiter(content);
  const delimiterName = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' }[delimiter] || delimiter;

  return [
    `Rows: ${rows.length}`,
    `Columns: ${rows[0]?.length || 0}`,
    `Delimiter: ${delimiterName}`,
    `Headers: ${rows[0]?.join(', ') || 'none'}`,
  ].join('\n');
}

// Regex
export function parseRegex(content: string): { pattern: string; flags: string } | null {
  const match = content.match(/^\/(.+)\/([gimsuy]*)$/);
  if (!match) return null;
  return { pattern: match[1], flags: match[2] };
}

export function escapeRegex(content: string): string {
  const parsed = parseRegex(content);
  const pattern = parsed ? parsed.pattern : content;
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function regexInfo(content: string): string {
  const parsed = parseRegex(content);
  if (!parsed) return 'Invalid regex format (expected /pattern/flags)';

  const flagDescriptions: Record<string, string> = {
    g: 'global',
    i: 'case-insensitive',
    m: 'multiline',
    s: 'dotAll',
    u: 'unicode',
    y: 'sticky',
  };

  const flags = parsed.flags.split('').map(f => flagDescriptions[f] || f).join(', ');

  return [
    `Pattern: ${parsed.pattern}`,
    `Flags: ${parsed.flags || 'none'}${flags ? ` (${flags})` : ''}`,
  ].join('\n');
}

// Hex
export function hexToText(content: string): string {
  const hex = content.replace(/^0x/i, '').replace(/\s/g, '');
  if (!/^[0-9A-Fa-f]+$/.test(hex) || hex.length % 2 !== 0) return content;

  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    // Decode as UTF-8 so the round trip holds for emoji and non-Latin text.
    return new TextDecoder('utf-8').decode(bytes);
  } catch { return content; }
}

export function textToHex(content: string): string {
  // Encode UTF-8 bytes: charCodeAt(0) drops astral chars to a lone surrogate and
  // emits >2 hex digits per code point, so textToHex('😀') round-trips wrong.
  const bytes = new TextEncoder().encode(content);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function hexToDecimal(content: string): string {
  const hex = content.replace(/^0x/i, '');
  if (!/^[0-9A-Fa-f]+$/.test(hex)) return content;
  return BigInt('0x' + hex).toString(10);
}

export function hexToBinary(content: string): string {
  const hex = content.replace(/^0x/i, '');
  if (!/^[0-9A-Fa-f]+$/.test(hex)) return content;
  return BigInt('0x' + hex).toString(2);
}

// ─── Format Conversion ───

export function jsonToCsv(content: string): string {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data) || data.length === 0) return content;
    const headers = Object.keys(data[0]);
    const rows = data.map((row: Record<string, unknown>) =>
      headers.map(h => {
        const val = String(row[h] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  } catch { return content; }
}

export function xmlToJson(content: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const errors = doc.getElementsByTagName('parsererror');
    if (errors.length > 0) return content;

    function nodeToObj(node: Element): unknown {
      const obj: Record<string, unknown> = {};

      // Attributes
      if (node.attributes.length > 0) {
        const attrs: Record<string, string> = {};
        for (let i = 0; i < node.attributes.length; i++) {
          attrs[node.attributes[i].name] = node.attributes[i].value;
        }
        obj['@attributes'] = attrs;
      }

      // Child elements
      const children = node.children;
      if (children.length === 0) {
        const text = node.textContent?.trim() || '';
        if (Object.keys(obj).length === 0) return text;
        obj['#text'] = text;
        return obj;
      }

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const name = child.tagName;
        const value = nodeToObj(child);
        if (obj[name] !== undefined) {
          if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
          (obj[name] as unknown[]).push(value);
        } else {
          obj[name] = value;
        }
      }
      return obj;
    }

    const result = { [doc.documentElement.tagName]: nodeToObj(doc.documentElement) };
    return JSON.stringify(result, null, 2);
  } catch { return content; }
}

export function jsonToXml(content: string): string {
  try {
    const data = JSON.parse(content);

    function toXml(obj: unknown, tag?: string): string {
      if (obj === null || obj === undefined) return tag ? `<${tag}/>` : '';
      if (typeof obj !== 'object') return tag ? `<${tag}>${escapeHtml(String(obj))}</${tag}>` : escapeHtml(String(obj));

      if (Array.isArray(obj)) {
        return obj.map(item => toXml(item, tag)).join('\n');
      }

      const record = obj as Record<string, unknown>;
      const attrs = record['@attributes'] as Record<string, string> | undefined;
      const attrStr = attrs ? ' ' + Object.entries(attrs).map(([k, v]) => `${k}="${escapeHtml(v)}"`).join(' ') : '';

      const children = Object.entries(record)
        .filter(([k]) => k !== '@attributes' && k !== '#text')
        .map(([k, v]) => toXml(v, k))
        .join('\n');

      const text = record['#text'] ? String(record['#text']) : '';
      const inner = children + text;

      if (tag) return inner ? `<${tag}${attrStr}>\n${inner}\n</${tag}>` : `<${tag}${attrStr}/>`;
      return inner;
    }

    const keys = Object.keys(data);
    if (keys.length === 1) {
      return `<?xml version="1.0" encoding="UTF-8"?>\n${toXml(data[keys[0]], keys[0])}`;
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${toXml(data)}\n</root>`;
  } catch { return content; }
}

export function dateToTimestamp(content: string): string {
  const date = new Date(content.trim());
  if (isNaN(date.getTime())) return content;
  return String(Math.floor(date.getTime() / 1000));
}

// ─── Hash Generation ───

export async function hashMd5(content: string): Promise<string> {
  // MD5 implementation (not available in Web Crypto, using pure JS)
  const data = new TextEncoder().encode(content);
  const md5 = computeMd5(data);
  return md5;
}

function computeMd5(input: Uint8Array): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);  d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);   b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);   d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);  b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);   d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);      b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);   d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);   d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);   b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);  b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);     d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);   b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);  d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);   b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);       d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);  b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);   d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);   b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);   b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);   b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);   d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);     b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);  b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function add32(a: number, b: number) { return (a + b) & 0xFFFFFFFF; }

  const n = input.length;
  const state = [1732584193, -271733879, -1732584194, 271733878];
  let i: number;

  // Pre-processing: adding padding bits
  const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (i = 0; i < 64; i++) tail[i >> 2] |= 0; // reset
  const msg = new Array(n + 72);

  for (i = 0; i < n; i++) msg[i] = input[i];
  msg[n] = 0x80;
  for (i = n + 1; i < msg.length; i++) msg[i] = 0;

  const bitLen = n * 8;
  const totalLen = ((n + 8) >> 6) + 1;

  for (let j = 0; j < totalLen; j++) {
    for (i = 0; i < 16; i++) tail[i] = 0;
    for (i = 0; i < 64; i++) {
      const idx = j * 64 + i;
      if (idx < msg.length) tail[i >> 2] |= msg[idx] << ((i % 4) << 3);
    }
    if (j === totalLen - 1) {
      tail[14] = bitLen;
      tail[15] = 0;
    }
    md5cycle(state, tail);
  }

  function hex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++) s += ((n >> (j * 8 + 4)) & 0xF).toString(16) + ((n >> (j * 8)) & 0xF).toString(16);
    return s;
  }

  return hex(state[0]) + hex(state[1]) + hex(state[2]) + hex(state[3]);
}

export async function hashSha512(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashSha1(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hashAll(content: string): Promise<string> {
  return Promise.all([
    hashMd5(content),
    hashSha1(content),
    hashSha256(content),
    hashSha512(content),
  ]).then(([md5, sha1, sha256, sha512]) =>
    `MD5:    ${md5}\nSHA-1:  ${sha1}\nSHA-256: ${sha256}\nSHA-512: ${sha512}`
  );
}

// ─── Text Manipulation ───

export function sortLines(content: string): string {
  return content.split('\n').sort((a, b) => a.localeCompare(b)).join('\n');
}

export function sortLinesReverse(content: string): string {
  return content.split('\n').sort((a, b) => b.localeCompare(a)).join('\n');
}

export function deduplicateLines(content: string): string {
  return [...new Set(content.split('\n'))].join('\n');
}

export function reverseLines(content: string): string {
  return content.split('\n').reverse().join('\n');
}

export function reverseText(content: string): string {
  return [...content].reverse().join('');
}

export function trimLines(content: string): string {
  return content.split('\n').map(line => line.trim()).join('\n');
}

export function removeEmptyLines(content: string): string {
  return content.split('\n').filter(line => line.trim().length > 0).join('\n');
}

export function numberLines(content: string): string {
  return content.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
}

export function wrapLines(content: string): string {
  const maxLen = 80;
  return content.split('\n').map(line => {
    if (line.length <= maxLen) return line;
    const words = line.split(' ');
    const wrapped: string[] = [];
    let current = '';
    for (const word of words) {
      if (current.length + word.length + 1 > maxLen) {
        wrapped.push(current);
        current = word;
      } else {
        current = current ? current + ' ' + word : word;
      }
    }
    if (current) wrapped.push(current);
    return wrapped.join('\n');
  }).join('\n');
}

export function shuffleLines(content: string): string {
  const lines = content.split('\n');
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lines[i], lines[j]] = [lines[j], lines[i]];
  }
  return lines.join('\n');
}

export function titleCase(content: string): string {
  return content.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

export function kebabCase(content: string): string {
  return content.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[\s_]+/g, '-');
}

export function pascalCase(content: string): string {
  return content.toLowerCase().replace(/(?:^|[^a-zA-Z0-9])(.)/g, (_, c) => c.toUpperCase());
}

export function countStats(content: string): string {
  const lines = content.split('\n').length;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const chars = content.length;
  const charsNoSpaces = content.replace(/\s/g, '').length;
  const bytes = new TextEncoder().encode(content).length;
  return `Lines: ${lines}\nWords: ${words}\nCharacters: ${chars}\nCharacters (no spaces): ${charsNoSpaces}\nBytes: ${bytes}`;
}

// Code Formatting with Prettier (lazy loaded)
let prettierLoaded = false;
let prettierModule: typeof import('prettier') | null = null;
let babelPlugin: typeof import('prettier/plugins/babel') | null = null;
let estreePlugin: typeof import('prettier/plugins/estree') | null = null;
let tsPlugin: typeof import('prettier/plugins/typescript') | null = null;

async function loadPrettier() {
  if (!prettierLoaded) {
    const [prettier, babel, estree, typescript] = await Promise.all([
      import('prettier'),
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/typescript'),
    ]);
    prettierModule = prettier;
    babelPlugin = babel;
    estreePlugin = estree;
    tsPlugin = typescript;
    prettierLoaded = true;
  }
}

export async function beautifyJavaScript(content: string): Promise<string> {
  try {
    await loadPrettier();
    if (!prettierModule || !babelPlugin || !estreePlugin) return content;

    return await prettierModule.format(content, {
      parser: 'babel',
      plugins: [babelPlugin, estreePlugin],
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
    });
  } catch {
    return content;
  }
}

export async function beautifyTypeScript(content: string): Promise<string> {
  try {
    await loadPrettier();
    if (!prettierModule || !tsPlugin || !estreePlugin) return content;

    return await prettierModule.format(content, {
      parser: 'typescript',
      plugins: [tsPlugin, estreePlugin],
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
    });
  } catch {
    return content;
  }
}
