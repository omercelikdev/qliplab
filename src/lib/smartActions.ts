import type { DetectedFormat } from '@/types/clipboard';

/**
 * Contextual "do something with this" actions derived from a clip's content —
 * open a link, draft an email, dial a number, drop a pin on a map. Pure and
 * side-effect-free: it only decides *what* is actionable and returns the URI
 * to hand to the system opener. The caller performs the open.
 *
 * Detection is deliberately strict — a false positive (offering "Call" on a
 * random long number) is worse than missing one, so each matcher anchors the
 * whole trimmed, single-line content.
 */

export type SmartActionKind = 'openUrl' | 'email' | 'call' | 'map';

export interface SmartAction {
  kind: SmartActionKind;
  /** URI to pass to the system opener (https:, mailto:, tel:, maps URL). */
  href: string;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A phone-like string: optional +, then digits with common separators.
const RE_PHONE = /^\+?[\d][\d\s().-]{5,}$/;
// "lat, lng" with sane ranges checked below.
const RE_COORD = /^(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/;

function urlHref(content: string, format: DetectedFormat): string | null {
  const s = content.trim();
  if (/^https?:\/\//i.test(s)) return s;
  // A scheme-less host the detector still flagged as a URL (e.g. "www.x.com").
  if (format === 'url') return `https://${s}`;
  return null;
}

export function getSmartActions(content: string, format: DetectedFormat): SmartAction[] {
  const s = content.trim();
  // Single-line only — a paragraph that happens to contain an address isn't an
  // actionable email/phone.
  if (!s || s.includes('\n')) {
    // A multi-line clip can still be a plain URL if the detector said so.
    const href = urlHref(content, format);
    return href ? [{ kind: 'openUrl', href }] : [];
  }

  const url = urlHref(content, format);
  if (url) return [{ kind: 'openUrl', href: url }];

  if (RE_EMAIL.test(s)) return [{ kind: 'email', href: `mailto:${s}` }];

  const coord = s.match(RE_COORD);
  if (coord) {
    const lat = parseFloat(coord[1]);
    const lng = parseFloat(coord[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [{ kind: 'map', href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` }];
    }
  }

  if (RE_PHONE.test(s)) {
    const digits = s.replace(/[^\d]/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      const tel = (s.trim().startsWith('+') ? '+' : '') + digits;
      return [{ kind: 'call', href: `tel:${tel}` }];
    }
  }

  return [];
}
