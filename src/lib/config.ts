export const CONFIG = {
  ISSUE_REPORTER_URL: 'https://qliplab-api.omercelikdev.workers.dev/report',
  CONSENT_LOG_URL: 'https://qliplab-api.omercelikdev.workers.dev/consent',
  LICENSE_API_URL: 'https://qliplab-api.omercelikdev.workers.dev/license',
  PURCHASE_URL: 'https://omercelik.dev',
  // Soft anti-abuse gate for the Worker (also enforced server-side + rate-limited).
  // Not a true secret (extractable from the binary) — it only blocks anonymous drive-by calls.
  APP_TOKEN: '797aa823fe7a195950e5aab53ded63c20fdd7b0f23742726',
  APP_VERSION: '0.1.20',
};
