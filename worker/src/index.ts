/**
 * qliplab-api — Cloudflare Worker
 *
 * Routes (all require the X-App-Token header AND are per-IP rate limited):
 *   POST /report   → create a GitHub issue (errors + feedback)
 *   POST /consent  → store an AI/EULA consent record in D1 (legal/PII)
 *
 * Code is private; GITHUB_TOKEN + APP_TOKEN are Worker secrets (never exposed).
 * X-App-Token is a soft gate (extractable from the app binary) — it blocks
 * anonymous drive-by abuse; the per-IP rate limit bounds damage regardless.
 */

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  APP_TOKEN: string;
  DB: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
  'Content-Type': 'application/json',
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function cap(v: string, max: number): string {
  return v.length > max ? v.slice(0, max) : v;
}

function clientIp(req: Request): string {
  return req.headers.get('CF-Connecting-IP') || 'unknown';
}

/** Per-IP windowed rate limit backed by D1. Returns true if allowed. */
async function allowRequest(env: Env, ip: string): Promise<boolean> {
  const WINDOW = 60; // seconds
  const LIMIT = 30; // requests per window per IP
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % WINDOW);
  const id = `${ip}:${windowStart}`;
  const row = await env.DB.prepare(
    `INSERT INTO rate_limit (id, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT(id) DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(id, windowStart)
    .first<{ count: number }>();
  const count = row?.count ?? 1;
  if (count === 1) {
    // opportunistic cleanup of stale windows
    await env.DB.prepare(`DELETE FROM rate_limit WHERE window_start < ?1`).bind(windowStart - 300).run();
  }
  return count <= LIMIT;
}

// ── /report — error reports + manual feedback (GitHub Issues) ─

interface ReportPayload {
  title?: string;
  body?: string;
  labels?: string[];
}

/** GitHub requires a User-Agent header or it returns 403. */
async function createGitHubIssue(
  env: Env,
  issue: { title: string; body: string; labels: string[] },
): Promise<Response> {
  return fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'qliplab-api',
      },
      body: JSON.stringify(issue),
    },
  );
}

async function handleReport(req: Request, env: Env): Promise<Response> {
  const data = (await req.json()) as ReportPayload;

  if (!data.title || !data.body) {
    return json({ success: false, error: 'Missing title or body' }, 400);
  }

  const labels = (Array.isArray(data.labels) ? data.labels : [])
    .slice(0, 10)
    .map((l) => cap(String(l), 50));

  const res = await createGitHubIssue(env, {
    title: cap(String(data.title), 200),
    body: cap(String(data.body), 20000),
    labels,
  });

  if (!res.ok) {
    return json({ success: false, error: `GitHub ${res.status}` }, 502);
  }

  const issue = (await res.json()) as { number: number; html_url: string };
  return json({ success: true, issueNumber: issue.number, issueUrl: issue.html_url });
}

// ── /consent — AI/EULA consent audit (D1, legal + PII) ───────

interface ConsentPayload {
  consentId?: string;
  action?: 'grant' | 'revoke';
  termsVersion?: string;
  termsText?: string | string[];
  provider?: string;
  timestamp?: string;
  appVersion?: string;
  platform?: string;
  locale?: string;
  integrityHash?: string;
}

async function handleConsent(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as ConsentPayload;

  const required: (keyof ConsentPayload)[] = [
    'consentId',
    'action',
    'termsVersion',
    'provider',
    'timestamp',
    'appVersion',
    'integrityHash',
  ];
  for (const f of required) {
    if (!body[f]) {
      return json({ success: false, error: `Missing: ${f}` }, 400);
    }
  }
  if (body.action !== 'grant' && body.action !== 'revoke') {
    return json({ success: false, error: 'Invalid action' }, 400);
  }

  const termsText =
    typeof body.termsText === 'string'
      ? cap(body.termsText, 8000)
      : Array.isArray(body.termsText)
        ? cap(JSON.stringify(body.termsText), 8000)
        : null;

  const result = await env.DB.prepare(
    `INSERT INTO consent_log
       (consent_id, action, terms_version, terms_text, provider, timestamp,
        app_version, platform, locale, integrity_hash, server_received)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      cap(String(body.consentId), 64),
      body.action,
      cap(String(body.termsVersion), 32),
      termsText,
      cap(String(body.provider), 32),
      cap(String(body.timestamp), 40),
      cap(String(body.appVersion), 32),
      body.platform ? cap(String(body.platform), 256) : null,
      body.locale ? cap(String(body.locale), 32) : null,
      cap(String(body.integrityHash), 128),
      new Date().toISOString(),
    )
    .run();

  if (!result.success) {
    return json({ success: false, error: 'DB write failed' }, 502);
  }

  return json({ success: true, consentId: body.consentId, id: result.meta.last_row_id });
}

// ── Router ───────────────────────────────────────────────────

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Soft auth gate: reject anonymous callers that don't carry the app token.
    if (req.headers.get('X-App-Token') !== env.APP_TOKEN) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Per-IP rate limit (bounds abuse even if the token is extracted).
    if (!(await allowRequest(env, clientIp(req)))) {
      return json({ success: false, error: 'Rate limit exceeded' }, 429);
    }

    const { pathname } = new URL(req.url);
    try {
      if (pathname === '/report' || pathname === '/issue') return await handleReport(req, env);
      if (pathname === '/consent') return await handleConsent(req, env);
      return json({ error: 'Not found' }, 404);
    } catch {
      return json({ success: false, error: 'Server error' }, 500);
    }
  },
};
