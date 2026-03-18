/**
 * Consent Audit System
 *
 * 3-layer proof of consent:
 *   1. Local audit log  — consent-audit.json, SHA-256 integrity hash
 *   2. Remote backend    — pluggable: GitHub Issues (default), Supabase, etc.
 *   3. Code evidence     — consent UI requires 3 explicit checkboxes per CONSENT_TERMS
 *
 * MIGRATION GUIDE (backend switch):
 *   1. Create new backend implementing ConsentBackend interface
 *   2. Change getRemoteBackend() in this file
 *   3. Done. Local log + consent UI stay the same.
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
  provider: 'anthropic' | 'openai' | 'gemini' | 'eula';
  timestamp: string;
  appVersion: string;
  platform: string;
  locale: string;
  integrityHash: string;
}

/**
 * Backend interface — implement this to add a new storage backend.
 *
 * Current:  ValTownGitHubBackend (Val.town proxy → GitHub Issues)
 * Future:   SupabaseBackend, PlanetScaleBackend, etc.
 */
export interface ConsentBackend {
  send(record: ConsentRecord): Promise<{ success: boolean; ref?: string }>;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Record a consent event with full audit trail.
 * Stores locally AND sends to remote backend.
 *
 * IMPORTANT: Server receipt is REQUIRED for 'grant' actions.
 * If the server fails to record consent, the function throws
 * and consent must NOT be granted. This ensures we always have
 * server-side proof of consent.
 *
 * 'revoke' actions are best-effort on the server side.
 */
export async function recordConsent(
  action: 'grant' | 'revoke',
  provider: 'anthropic' | 'openai' | 'gemini' | 'eula',
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

  // Layer 1: Local (always, regardless of server result)
  await saveToLocalLog(record);

  // Layer 2: Remote — REQUIRED for grants, best-effort for revokes
  // In development, skip server calls (local log is still written above)
  if (!import.meta.env.DEV) {
    const backend = getRemoteBackend();

    if (action === 'grant') {
      // Grant MUST be recorded on server — no server receipt = no consent
      const result = await backend.send(record);
      if (!result.success) {
        throw new Error('CONSENT_SERVER_FAILED');
      }
    } else {
      // Revoke is best-effort on server
      backend.send(record).catch(() => {});
    }
  }

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

// ─── Backend: Val.town → GitHub Issues (current) ────────────

class ValTownGitHubBackend implements ConsentBackend {
  constructor(private url: string) {}

  async send(record: ConsentRecord): Promise<{ success: boolean; ref?: string }> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consentId: record.id,
        action: record.action,
        termsVersion: record.termsVersion,
        termsText: record.termsText,
        provider: record.provider,
        timestamp: record.timestamp,
        appVersion: record.appVersion,
        platform: record.platform,
        locale: record.locale,
        integrityHash: record.integrityHash,
      }),
    });

    if (!res.ok) return { success: false };

    const data = await res.json();
    return { success: true, ref: data.issueNumber?.toString() };
  }
}

// ─── Backend: Supabase (future, ready to drop in) ───────────
//
// class SupabaseBackend implements ConsentBackend {
//   constructor(private url: string, private anonKey: string) {}
//
//   async send(record: ConsentRecord) {
//     const res = await fetch(`${this.url}/rest/v1/consent_log`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'apikey': this.anonKey,
//         'Authorization': `Bearer ${this.anonKey}`,
//       },
//       body: JSON.stringify({
//         id: record.id,
//         action: record.action,
//         terms_version: record.termsVersion,
//         terms_text: record.termsText,
//         provider: record.provider,
//         timestamp: record.timestamp,
//         app_version: record.appVersion,
//         platform: record.platform,
//         locale: record.locale,
//         integrity_hash: record.integrityHash,
//       }),
//     });
//     return { success: res.ok };
//   }
// }

// ─── Backend selector ────────────────────────────────────────
//
// MIGRATION: Sadece bu fonksiyonu değiştir, başka hiçbir yere dokunma.
//

function getRemoteBackend(): ConsentBackend {
  return new ValTownGitHubBackend(CONFIG.CONSENT_LOG_URL);

  // Future (tek satır değiştir):
  // return new SupabaseBackend(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
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
    // Audit log write failed
  }
}
