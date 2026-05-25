/**
 * qliplab-api — Cloudflare Worker
 *
 * Routes:
 *   POST /report   → create a GitHub issue (auto error reports + manual feedback)
 *   POST /consent  → store an AI/EULA consent record in D1 (legal audit, PII)
 *
 * Replaces the old Val.town vals. Code is private; GITHUB_TOKEN is a Worker
 * secret (never exposed). Consent PII lives in D1, NOT GitHub Issues.
 */

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  DB: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
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

  const res = await createGitHubIssue(env, {
    title: data.title,
    body: data.body,
    labels: Array.isArray(data.labels) ? data.labels : [],
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
      ? body.termsText
      : Array.isArray(body.termsText)
        ? JSON.stringify(body.termsText)
        : null;

  const result = await env.DB.prepare(
    `INSERT INTO consent_log
       (consent_id, action, terms_version, terms_text, provider, timestamp,
        app_version, platform, locale, integrity_hash, server_received)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.consentId,
      body.action,
      body.termsVersion,
      termsText,
      body.provider,
      body.timestamp,
      body.appVersion,
      body.platform ?? null,
      body.locale ?? null,
      body.integrityHash,
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
