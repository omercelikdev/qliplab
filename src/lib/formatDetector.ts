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
  markdown: 'Markdown',
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

// Pre-compiled regex patterns (module-level, compiled once)
const RE_JWT = /^eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RE_URL = /^https?:\/\/[^\s]+$/;
const RE_URL_ENCODED = /^[a-zA-Z0-9-_.~]+(%[0-9A-Fa-f]{2})+/;
const RE_BASE64 = /^[A-Za-z0-9+/]+=*$/;
const RE_BASE64_PADDING = /=+$/;
const RE_SQL = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i;
const RE_XML = /^<[a-zA-Z][\s\S]*>[\s\S]*<\/[a-zA-Z]+>$/;
const RE_HTML = /<(!DOCTYPE\s+)?html/i;
const RE_TIMESTAMP = /^\d{10,13}$/;
const RE_COLOR_HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const RE_COLOR_RGB = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+))?\s*\)$/i;
const RE_COLOR_HSL = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+))?\s*\)$/i;
const RE_YAML_KV = /^[\w-]+:\s*.+$/m;
const RE_REGEX = /^\/[^/]+\/[gimsuy]*$/;
const RE_HEX_PREFIX = /^0x[0-9A-Fa-f]+$/;
const RE_HEX_PURE = /^[0-9A-Fa-f]{8,}$/;
const RE_HEX_DIGITS_ONLY = /^\d+$/;
const RE_MD_HEADER = /^#{1,6}\s+\S/m;
const RE_MD_BOLD = /(\*\*|__).+(\*\*|__)/;
const RE_MD_LINK = /\[.+?\]\(.+?\)/;
const RE_MD_IMAGE = /!\[.*?\]\(.+?\)/;
const RE_MD_FENCE = /^```/m;
const RE_MD_BULLET = /^[\s]*[-*+]\s+\S/m;
const RE_MD_NUMBERED = /^\d+\.\s+\S/m;
const RE_MD_QUOTE = /^>\s+\S/m;
const RE_MD_HRULE = /^(---|\*\*\*|___)$/m;
const RE_TS_KEYWORD = /\b(interface|type|enum)\s+\w+/;
const RE_TS_TYPE = /:\s*(string|number|boolean|any|void|never)\b/;
const RE_TS_GENERIC = /<\w+>/;
const RE_TS_DECL = /\b(const|let|function)\b/;
const RE_RUST_FN = /\bfn\s+\w+\s*\(/;
const RE_RUST_KW = /\b(let\s+mut|impl|struct|enum|pub\s+fn|mod\s+\w+|use\s+\w+::)\b/;
const RE_GO_FUNC = /\bfunc\s+(\(\w+\s+\*?\w+\)\s+)?\w+\s*\(/;
const RE_GO_KW = /\b(package\s+\w+|import\s+["(]|:=)\b/;
const RE_PY_DEF = /\bdef\s+\w+\s*\(/;
const RE_PY_KW = /\b(import\s+\w+|from\s+\w+\s+import|class\s+\w+:)\b/;
const RE_PY_DEC = /^\s*@\w+/;
const RE_JAVA_KW = /\b(public|private|protected)\s+(static\s+)?(class|void|int|String)\b/;
const RE_JAVA_EXT = /\bclass\s+\w+\s*(extends|implements)\b/;
const RE_CS_NS = /\b(using\s+\w+;|namespace\s+\w+)\b/;
const RE_CS_TASK = /\b(public|private|protected)\s+(static\s+)?(async\s+)?Task\b/;
const RE_CS_VAR = /\bvar\s+\w+\s*=\s*new\s+/;
const RE_CS_CLASS = /\bclass\b/;
const RE_JS_DECL = /\b(const|let|var)\s+\w+\s*=/;
const RE_JS_FUNC = /\bfunction\s+\w+\s*\(/;
const RE_JS_ARROW = /=>\s*[{(]/;
const RE_JS_MODULE = /\b(import|export)\s+/;

const SENSITIVE_PATTERNS = [
  /password\s*[:=]/i,
  /secret\s*[:=]/i,
  /api[_-]?key\s*[:=]/i,
  /token\s*[:=]/i,
  /auth[_-]?token/i,
  /access[_-]?token/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
  /\b[A-Z]{2,4}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/,
  /\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}\b/,
  /\b(CVV|CVC|CVV2)\s*[:=]?\s*[0-9]{3,4}\b/i,
  /\bPIN\s*[:=]?\s*[0-9]{4,6}\b/i,
  /\b[0-9]{3}[- ]?[0-9]{2}[- ]?[0-9]{4}\b/,
  /\b[0-9]{11}\b/,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
  /-----BEGIN\s+PGP\s+PRIVATE/,
  /\b(sk-[a-zA-Z0-9_-]{20,})\b/,
  /\b(sk-ant-[a-zA-Z0-9_-]{20,})\b/,
  /\b(ghp_[a-zA-Z0-9]{36,})\b/,
  /\b(AKIA[0-9A-Z]{16})\b/,
];

export function detectFormat(content: string): DetectedFormat {
  const trimmed = content.trim();

  // JSON (check before YAML since valid JSON is also valid YAML)
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { JSON.parse(trimmed); return 'json'; } catch {}
  }

  if (RE_JWT.test(trimmed)) return 'jwt';
  if (RE_UUID.test(trimmed)) return 'uuid';
  if (RE_URL.test(trimmed)) return 'url';
  if (RE_URL_ENCODED.test(trimmed)) return 'url_encoded';

  // Base64 (stricter validation to avoid false positives)
  if (RE_BASE64.test(trimmed) && trimmed.length >= 24) {
    const withoutPadding = trimmed.replace(RE_BASE64_PADDING, '');
    const paddingNeeded = (4 - (withoutPadding.length % 4)) % 4;
    const actualPadding = trimmed.length - withoutPadding.length;
    if (paddingNeeded === actualPadding || actualPadding === 0) {
      try { atob(trimmed); return 'base64'; } catch {}
    }
  }

  if (RE_SQL.test(trimmed)) return 'sql';

  // XML/HTML
  if (RE_XML.test(trimmed)) {
    return RE_HTML.test(trimmed) ? 'html' : 'xml';
  }

  // Unix Timestamp
  if (RE_TIMESTAMP.test(trimmed)) {
    const num = parseInt(trimmed);
    const date = new Date(trimmed.length === 13 ? num : num * 1000);
    if (date.getFullYear() > 1970 && date.getFullYear() < 2100) return 'timestamp';
  }

  if (isColor(trimmed)) return 'color';
  if (isYaml(trimmed)) return 'yaml';
  if (isCsv(trimmed)) return 'csv';
  if (isRegex(trimmed)) return 'regex';
  if (isHex(trimmed)) return 'hex';
  if (isMarkdown(trimmed)) return 'markdown';

  const codeFormat = detectCodeFormat(trimmed);
  if (codeFormat) return codeFormat;

  return 'plain';
}

function isColor(content: string): boolean {
  if (RE_COLOR_HEX.test(content)) return true;
  if (RE_COLOR_RGB.test(content)) return true;
  if (RE_COLOR_HSL.test(content)) return true;
  return false;
}

function isYaml(content: string): boolean {
  if (!content.includes(':')) return false;
  if (!RE_YAML_KV.test(content)) return false;
  try {
    const result = yaml.load(content);
    return typeof result === 'object' && result !== null;
  } catch {
    return false;
  }
}

function isCsv(content: string): boolean {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return false;

  const delimiters = [',', ';', '\t', '|'];
  for (const delimiter of delimiters) {
    const firstLineCount = lines[0].split(delimiter).length;
    if (firstLineCount >= 2) {
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
  return RE_REGEX.test(content);
}

function isHex(content: string): boolean {
  if (RE_HEX_PREFIX.test(content)) return true;
  if (RE_HEX_PURE.test(content) && !RE_HEX_DIGITS_ONLY.test(content)) return true;
  return false;
}

function isMarkdown(content: string): boolean {
  let score = 0;
  if (RE_MD_HEADER.test(content)) score += 2;
  if (RE_MD_BOLD.test(content)) score++;
  if (RE_MD_LINK.test(content)) score++;
  if (RE_MD_IMAGE.test(content)) score++;
  if (RE_MD_FENCE.test(content)) score += 2;
  if (RE_MD_BULLET.test(content)) score++;
  if (RE_MD_NUMBERED.test(content)) score++;
  if (RE_MD_QUOTE.test(content)) score++;
  if (RE_MD_HRULE.test(content)) score++;

  return score >= 2;
}

function detectCodeFormat(content: string): DetectedFormat | null {
  // TypeScript (check before JS - more specific patterns)
  if (RE_TS_KEYWORD.test(content)) return 'code_ts';
  if (RE_TS_TYPE.test(content)) return 'code_ts';
  if (RE_TS_GENERIC.test(content) && RE_TS_DECL.test(content)) return 'code_ts';

  // Rust
  if (RE_RUST_FN.test(content)) return 'code_rust';
  if (RE_RUST_KW.test(content)) return 'code_rust';

  // Go
  if (RE_GO_FUNC.test(content)) return 'code_go';
  if (RE_GO_KW.test(content)) return 'code_go';

  // Python
  if (RE_PY_DEF.test(content)) return 'code_python';
  if (RE_PY_KW.test(content)) return 'code_python';
  if (RE_PY_DEC.test(content)) return 'code_python';

  // Java
  if (RE_JAVA_KW.test(content)) return 'code_java';
  if (RE_JAVA_EXT.test(content)) return 'code_java';

  // C#
  if (RE_CS_NS.test(content)) return 'code_csharp';
  if (RE_CS_TASK.test(content)) return 'code_csharp';
  if (RE_CS_VAR.test(content) && RE_CS_CLASS.test(content)) return 'code_csharp';

  // JavaScript (check last - most generic patterns)
  if (RE_JS_DECL.test(content)) return 'code_js';
  if (RE_JS_FUNC.test(content)) return 'code_js';
  if (RE_JS_ARROW.test(content)) return 'code_js';
  if (RE_JS_MODULE.test(content)) return 'code_js';

  return null;
}

export function isSensitive(content: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(content));
}
