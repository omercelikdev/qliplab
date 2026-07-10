/** Injected by Vite from package.json — see `define` in vite.config.ts. */
declare const __APP_VERSION__: string;

export const CONFIG = {
  ISSUE_REPORTER_URL: 'https://qliplab-api.omercelikdev.workers.dev/report',
  // Soft anti-abuse gate for the Worker (also enforced server-side + rate-limited).
  // Not a true secret (extractable from the binary) — it only blocks anonymous drive-by calls.
  APP_TOKEN: '797aa823fe7a195950e5aab53ded63c20fdd7b0f23742726',
  // Never hand-edit: it must match package.json, which matches Cargo.toml.
  APP_VERSION: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0',
};
