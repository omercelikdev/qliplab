/**
 * Consent Audit System (local-only)
 *
 * QlipLab is free & open source and AI features use the user's OWN API key —
 * data goes directly from the user's machine to the AI provider under the
 * user's own account. We therefore keep consent as a LOCAL record only
 * (on the user's device) for transparency; nothing is sent to or stored on
 * any QlipLab server.
 */

import { Store } from '@tauri-apps/plugin-store';
import { CONFIG } from './config';

// ─── Terms (bump version when text changes) ──────────────────

export const CONSENT_TERMS_VERSION = '1.0.0';

export const CONSENT_TERMS = [
  'My clipboard content will be sent to third-party AI servers when I use AI features.',
  'I am solely responsible for ensuring I do not send sensitive, confidential, or personal data to AI services.',
  'QlipLab and its developers are not liable for any data I choose to send to third-party AI providers.',
] as const;

// ─── Types ───────────────────────────────────────────────────

export interface ConsentRecord {
  id: string;
  action: 'grant' | 'revoke';
  termsVersion: string;
  termsText: readonly string[] | string;
  provider: 'anthropic' | 'openai' | 'gemini';
  timestamp: string;
  appVersion: string;
  platform: string;
  locale: string;
  integrityHash: string;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Record a consent event locally (on the user's own device).
 * Never fails the caller — a failed local write is swallowed so consent
 * flow is never blocked by disk issues.
 */
export async function recordConsent(
  action: 'grant' | 'revoke',
  provider: 'anthropic' | 'openai' | 'gemini',
  opts?: { termsVersion?: string; termsText?: string },
): Promise<ConsentRecord> {
  const partial: Omit<ConsentRecord, 'integrityHash'> = {
    id: generateId(),
    action,
    termsVersion: opts?.termsVersion ?? CONSENT_TERMS_VERSION,
    termsText: opts?.termsText ?? CONSENT_TERMS,
    provider,
    timestamp: new Date().toISOString(),
    appVersion: CONFIG.APP_VERSION,
    platform: navigator.userAgent,
    locale: navigator.language,
  };

  const integrityHash = await computeHash(hashPayload(partial));
  const record: ConsentRecord = { ...partial, integrityHash };

  await saveToLocalLog(record);
  return record;
}

/** Read local consent audit log */
export async function getConsentLog(): Promise<ConsentRecord[]> {
  try {
    const store = await Store.load('consent-audit.json');
    return (await store.get<ConsentRecord[]>('log')) ?? [];
  } catch {
    return [];
  }
}

/** Verify record integrity (tamper detection) */
export async function verifyRecord(record: ConsentRecord): Promise<boolean> {
  const { integrityHash, ...rest } = record;
  const expected = await computeHash(hashPayload(rest as Omit<ConsentRecord, 'integrityHash'>));
  return expected === integrityHash;
}

// ─── Internal helpers ────────────────────────────────────────

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function computeHash(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

function hashPayload(record: Omit<ConsentRecord, 'integrityHash'>): string {
  return JSON.stringify({
    id: record.id,
    action: record.action,
    termsVersion: record.termsVersion,
    termsText: record.termsText,
    provider: record.provider,
    timestamp: record.timestamp,
    appVersion: record.appVersion,
    platform: record.platform,
    locale: record.locale,
  });
}

async function saveToLocalLog(record: ConsentRecord): Promise<void> {
  try {
    const store = await Store.load('consent-audit.json');
    const existing = (await store.get<ConsentRecord[]>('log')) ?? [];
    existing.push(record);
    await store.set('log', existing);
    await store.save();
  } catch {
    // Audit log write failed — non-fatal
  }
}
