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
export function decodeJwt(content: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  const parts = content.split('.');
  if (parts.length !== 3) return null;
  try {
    return { header: JSON.parse(atob(parts[0])), payload: JSON.parse(atob(parts[1])) };
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
  const ts = parseInt(content);
  if (isNaN(ts)) return content;
  const date = new Date(content.length === 13 ? ts : ts * 1000);
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
  if (!/^[0-9A-Fa-f]+$/.test(hex)) return content;

  try {
    let text = '';
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return text;
  } catch { return content; }
}

export function textToHex(content: string): string {
  return Array.from(content)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
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
