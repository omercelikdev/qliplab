import type { DetectedFormat } from '@/types/clipboard';

export function detectFormat(content: string): DetectedFormat {
  const trimmed = content.trim();

  // JSON
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

  return 'plain';
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
