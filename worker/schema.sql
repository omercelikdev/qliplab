-- qliplab consent audit — Cloudflare D1 schema
-- Apply with: npx wrangler d1 execute qliplab --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS consent_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  consent_id      TEXT NOT NULL,
  action          TEXT NOT NULL,          -- 'grant' | 'revoke'
  terms_version   TEXT NOT NULL,
  terms_text      TEXT,                   -- JSON array (AI consent) or string (EULA)
  provider        TEXT NOT NULL,          -- 'anthropic' | 'openai' | 'gemini' | 'eula'
  timestamp       TEXT NOT NULL,          -- client ISO timestamp
  app_version     TEXT NOT NULL,
  platform        TEXT,
  locale          TEXT,
  integrity_hash  TEXT NOT NULL,          -- SHA-256, verifiable vs local consent-audit.json
  server_received TEXT NOT NULL           -- server ISO timestamp
);

CREATE INDEX IF NOT EXISTS idx_consent_provider   ON consent_log(provider);
CREATE INDEX IF NOT EXISTS idx_consent_action     ON consent_log(action);
CREATE INDEX IF NOT EXISTS idx_consent_consent_id ON consent_log(consent_id);

-- Per-IP rate limiting (windowed counters)
CREATE TABLE IF NOT EXISTS rate_limit (
  id           TEXT PRIMARY KEY,   -- "<ip>:<window_start>"
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit(window_start);
