-- qliplab-api — Cloudflare D1 schema
-- Apply with: npx wrangler d1 execute qliplab --remote --file=schema.sql

-- Per-IP rate limiting (windowed counters)
CREATE TABLE IF NOT EXISTS rate_limit (
  id           TEXT PRIMARY KEY,   -- "<ip>:<window_start>"
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit(window_start);
