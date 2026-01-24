import type { DetectedFormat } from '@/types/clipboard';
import yaml from 'js-yaml';

// User-friendly display names for formats
const formatDisplayNames: Record<DetectedFormat, string> = {
  json: 'JSON',
  jwt: 'JWT Token',
  base64: 'Base64',
  url: 'URL',
  url_encoded: 'URL Encoded',
  sql: 'SQL',
  xml: 'XML',
  html: 'HTML',
  uuid: 'UUID',
  timestamp: 'Timestamp',
  yaml: 'YAML',
  color: 'Color',
  csv: 'CSV',
  regex: 'Regex',
  hex: 'Hexadecimal',
  code_js: 'JavaScript',
  code_ts: 'TypeScript',
  code_python: 'Python',
  code_go: 'Go',
  code_rust: 'Rust',
  code_java: 'Java',
  code_csharp: 'C#',
  plain: 'Plain Text',
};

export function getFormatDisplayName(format: DetectedFormat): string {
  return formatDisplayNames[format] || format;
}

export function detectFormat(content: string): DetectedFormat {
  const trimmed = content.trim();

  // JSON (check before YAML since valid JSON is also valid YAML)
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { JSON.parse(trimmed); return 'json'; } catch {}
  }

  // JWT
  if (/^eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(trimmed)) return 'jwt';

  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return 'uuid';

  // URL
  if (/^https?:\/\/[^\s]+$/.test(trimmed)) return 'url';

  // URL Encoded
  if (/^[a-zA-Z0-9-_.~]+(%[0-9A-Fa-f]{2})+/.test(trimmed)) return 'url_encoded';

  // Base64
  if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length > 20) {
    try { atob(trimmed); return 'base64'; } catch {}
  }

  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i.test(trimmed)) return 'sql';

  // XML/HTML
  if (/^<[a-zA-Z][\s\S]*>[\s\S]*<\/[a-zA-Z]+>$/.test(trimmed)) {
    return /<(!DOCTYPE\s+)?html/i.test(trimmed) ? 'html' : 'xml';
  }

  // Unix Timestamp
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = parseInt(trimmed);
    const date = new Date(trimmed.length === 13 ? num : num * 1000);
    if (date.getFullYear() > 1970 && date.getFullYear() < 2100) return 'timestamp';
  }

  // Color (HEX, RGB, HSL)
  if (isColor(trimmed)) return 'color';

  // YAML (check for YAML-specific patterns)
  if (isYaml(trimmed)) return 'yaml';

  // CSV (must have at least 2 rows and consistent columns)
  if (isCsv(trimmed)) return 'csv';

  // Regex pattern
  if (isRegex(trimmed)) return 'regex';

  // Hex string (0x prefix or pure hex)
  if (isHex(trimmed)) return 'hex';

  // Programming Languages (check TypeScript before JavaScript)
  const codeFormat = detectCodeFormat(trimmed);
  if (codeFormat) return codeFormat;

  return 'plain';
}

function isColor(content: string): boolean {
  // HEX: #RGB, #RRGGBB, #RRGGBBAA
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(content)) return true;
  // RGB/RGBA
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/i.test(content)) return true;
  // HSL/HSLA
  if (/^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+))?\s*\)$/i.test(content)) return true;
  return false;
}

function isYaml(content: string): boolean {
  // Check for YAML document markers or key-value pairs
  if (!content.includes(':')) return false;
  // Avoid false positives with simple text containing colons
  if (!/^[\w-]+:\s*.+$/m.test(content)) return false;
  // Try parsing as YAML
  try {
    const result = yaml.load(content);
    // Must be object or array (not primitive)
    return typeof result === 'object' && result !== null;
  } catch {
    return false;
  }
}

function isCsv(content: string): boolean {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return false;

  // Detect delimiter
  const delimiters = [',', ';', '\t', '|'];
  for (const delimiter of delimiters) {
    const firstLineCount = lines[0].split(delimiter).length;
    if (firstLineCount >= 2) {
      // Check if all lines have consistent column count
      const consistent = lines.every(line => {
        const count = line.split(delimiter).length;
        return count === firstLineCount || Math.abs(count - firstLineCount) <= 1;
      });
      if (consistent) return true;
    }
  }
  return false;
}

function isRegex(content: string): boolean {
  // Pattern: /.../ with optional flags
  if (/^\/[^\/]+\/[gimsuy]*$/.test(content)) return true;
  return false;
}

function isHex(content: string): boolean {
  // 0x prefix
  if (/^0x[0-9A-Fa-f]+$/.test(content)) return true;
  // Pure hex string (at least 8 chars to avoid false positives)
  if (/^[0-9A-Fa-f]{8,}$/.test(content) && !/^\d+$/.test(content)) return true;
  return false;
}

function detectCodeFormat(content: string): DetectedFormat | null {
  // TypeScript (check before JS - more specific patterns)
  if (/\b(interface|type|enum)\s+\w+/.test(content)) return 'code_ts';
  if (/:\s*(string|number|boolean|any|void|never)\b/.test(content)) return 'code_ts';
  if (/<\w+>/.test(content) && /\b(const|let|function)\b/.test(content)) return 'code_ts';

  // Rust
  if (/\bfn\s+\w+\s*\(/.test(content)) return 'code_rust';
  if (/\b(let\s+mut|impl|struct|enum|pub\s+fn|mod\s+\w+|use\s+\w+::)\b/.test(content)) return 'code_rust';

  // Go
  if (/\bfunc\s+(\(\w+\s+\*?\w+\)\s+)?\w+\s*\(/.test(content)) return 'code_go';
  if (/\b(package\s+\w+|import\s+["(]|:=)\b/.test(content)) return 'code_go';

  // Python
  if (/\bdef\s+\w+\s*\(/.test(content)) return 'code_python';
  if (/\b(import\s+\w+|from\s+\w+\s+import|class\s+\w+:)\b/.test(content)) return 'code_python';
  if (/^\s*@\w+/.test(content)) return 'code_python'; // Decorators

  // Java
  if (/\b(public|private|protected)\s+(static\s+)?(class|void|int|String)\b/.test(content)) return 'code_java';
  if (/\bclass\s+\w+\s*(extends|implements)\b/.test(content)) return 'code_java';

  // C#
  if (/\b(using\s+\w+;|namespace\s+\w+)\b/.test(content)) return 'code_csharp';
  if (/\b(public|private|protected)\s+(static\s+)?(async\s+)?Task\b/.test(content)) return 'code_csharp';
  if (/\bvar\s+\w+\s*=\s*new\s+/.test(content) && /\bclass\b/.test(content)) return 'code_csharp';

  // JavaScript (check last - most generic patterns)
  if (/\b(const|let|var)\s+\w+\s*=/.test(content)) return 'code_js';
  if (/\bfunction\s+\w+\s*\(/.test(content)) return 'code_js';
  if (/=>\s*[{(]/.test(content)) return 'code_js';
  if (/\b(import|export)\s+/.test(content)) return 'code_js';

  return null;
}

export function isSensitive(content: string): boolean {
  const patterns = [
    /password\s*[:=]/i,
    /secret\s*[:=]/i,
    /api[_-]?key\s*[:=]/i,
    /token\s*[:=]/i,
    /\b[A-Z]{2,4}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/, // IBAN
    /\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}\b/, // Credit card
  ];
  return patterns.some(pattern => pattern.test(content));
}
