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

// Base64
export function encodeBase64(content: string): string { return btoa(content); }
export function decodeBase64(content: string): string { try { return atob(content); } catch { return content; } }

// URL
export function encodeUrl(content: string): string { return encodeURIComponent(content); }
export function decodeUrl(content: string): string { try { return decodeURIComponent(content); } catch { return content; } }

// JWT
export function decodeJwt(content: string): { header: any; payload: any } | null {
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
  return new Date(content.length === 13 ? ts : ts * 1000).toISOString();
}

// HTML
export function escapeHtml(content: string): string {
  return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function unescapeHtml(content: string): string {
  return content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}
