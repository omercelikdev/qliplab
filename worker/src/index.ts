/**
 * qliplab-api — Cloudflare Worker
 *
 * Routes (all require the X-App-Token header AND are per-IP rate limited):
 *   POST /report                               → create a GitHub issue (errors + feedback)
 *   POST /consent                              → store an AI/EULA consent record in D1 (legal/PII)
 *   POST /license/activate|validate|deactivate → Lemon Squeezy License API proxy
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
  /** Lemon Squeezy API key (needed only for /license/by-order). */
  LS_API_KEY?: string;
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

// ── /license/* — Lemon Squeezy License API proxy ─────────────

const LS_BASE = 'https://api.lemonsqueezy.com/v1/licenses';

interface LicensePayload {
  key?: string;
  instanceName?: string;
  instanceId?: string;
}

interface LsResponse {
  activated?: boolean;
  valid?: boolean;
  deactivated?: boolean;
  error?: string | null;
  instance?: { id: string } | null;
  license_key?: { status?: string; expires_at?: string | null };
}

async function lsCall(action: string, params: Record<string, string>): Promise<LsResponse> {
  const res = await fetch(`${LS_BASE}/${action}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  return (await res.json()) as LsResponse;
}

async function handleLicenseActivate(req: Request): Promise<Response> {
  const { key, instanceName } = (await req.json()) as LicensePayload;
  if (!key || !instanceName) {
    return json({ success: false, error: 'Missing key or instanceName' }, 400);
  }
  const data = await lsCall('activate', {
    license_key: cap(key, 100),
    instance_name: cap(instanceName, 100),
  });
  return json({
    success: true,
    valid: data.activated === true,
    instanceId: data.instance?.id ?? null,
    status: data.license_key?.status ?? null,
    expiresAt: data.license_key?.expires_at ?? null,
    error: data.error ?? null,
  });
}

async function handleLicenseValidate(req: Request): Promise<Response> {
  const { key, instanceId } = (await req.json()) as LicensePayload;
  if (!key) {
    return json({ success: false, error: 'Missing key' }, 400);
  }
  const params: Record<string, string> = { license_key: cap(key, 100) };
  if (instanceId) params.instance_id = cap(instanceId, 100);
  const data = await lsCall('validate', params);
  return json({
    success: true,
    valid: data.valid === true,
    status: data.license_key?.status ?? null,
    expiresAt: data.license_key?.expires_at ?? null,
    error: data.error ?? null,
  });
}

async function handleLicenseDeactivate(req: Request): Promise<Response> {
  const { key, instanceId } = (await req.json()) as LicensePayload;
  if (!key || !instanceId) {
    return json({ success: false, error: 'Missing key or instanceId' }, 400);
  }
  const data = await lsCall('deactivate', {
    license_key: cap(key, 100),
    instance_id: cap(instanceId, 100),
  });
  return json({ success: true, deactivated: data.deactivated === true, error: data.error ?? null });
}

/**
 * Look up the license key for an order. Used by the deep-link auto-activation
 * flow: app receives qliplab://activate?order_id=X, calls this to fetch the
 * key (which LS does NOT put in the redirect URL for security), then activates.
 *
 * Requires LS_API_KEY (different from the public /license endpoints).
 */
async function handleLicenseByOrder(req: Request, env: Env): Promise<Response> {
  if (!env.LS_API_KEY) {
    return json({ success: false, error: 'LS_API_KEY not configured' }, 500);
  }
  let orderId: string | null = null;
  try {
    const body = (await req.json()) as { orderId?: string; order_id?: string };
    orderId = body.orderId ?? body.order_id ?? null;
  } catch {
    // body parse failed — orderId stays null, validation below handles it
  }
  if (!orderId) {
    return json({ success: false, error: 'Missing orderId' }, 400);
  }
  const safeId = encodeURIComponent(cap(String(orderId), 64));
  const headers = {
    Authorization: `Bearer ${env.LS_API_KEY}`,
    Accept: 'application/vnd.api+json',
  };

  // Approach 1: list license-keys filtered by order_id (brackets URL-encoded).
  let res = await fetch(
    `https://api.lemonsqueezy.com/v1/license-keys?filter%5Border_id%5D=${safeId}`,
    { headers },
  );
  if (res.ok) {
    const data = (await res.json()) as {
      data?: Array<{ attributes?: { key?: string; status?: string } }>;
    };
    const first = data.data?.[0]?.attributes;
    if (first?.key) {
      return json({ success: true, key: first.key, status: first.status ?? null });
    }
  }

  // Approach 2 (fallback): fetch the order directly with its license-keys included.
  // Handles the case where the caller passes the LS order resource id.
  res = await fetch(
    `https://api.lemonsqueezy.com/v1/orders/${safeId}?include=license-keys`,
    { headers },
  );
  if (res.ok) {
    const data = (await res.json()) as {
      included?: Array<{ type?: string; attributes?: { key?: string; status?: string } }>;
    };
    const lk = data.included?.find((x) => x.type === 'license-keys');
    if (lk?.attributes?.key) {
      return json({ success: true, key: lk.attributes.key, status: lk.attributes.status ?? null });
    }
  }

  return json({ success: false, error: 'License key not found for order' }, 404);
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
      if (pathname === '/license/activate') return await handleLicenseActivate(req);
      if (pathname === '/license/validate') return await handleLicenseValidate(req);
      if (pathname === '/license/deactivate') return await handleLicenseDeactivate(req);
      if (pathname === '/license/by-order') return await handleLicenseByOrder(req, env);
      return json({ error: 'Not found' }, 404);
    } catch {
      return json({ success: false, error: 'Server error' }, 500);
    }
  },
};
