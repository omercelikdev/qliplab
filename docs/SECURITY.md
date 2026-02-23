# Security & App Store Compliance

## Security Architecture

### Encryption
- **Vault:** AES-256-GCM via Web Crypto API
- **Key Derivation:** PBKDF2 with 210,000 iterations + random 16-byte salt (legacy 100K auto-migrated)
- **IV:** Random 12-byte per encryption operation
- **Password Hash:** Salted SHA-256, format `base64(salt):base64(hash)`

### Data Storage
| Data | Storage | Encryption |
|------|---------|-----------|
| Clipboard history | SQLite (`qliplab.db`) | None (plaintext) |
| Snippets | SQLite | None |
| Vault items | SQLite (`encrypted_data` column) | AES-256-GCM |
| Settings | Tauri Store (`settings.json`) | None |
| Consent audit | Tauri Store (`consent-audit.json`) | None (integrity hash) |
| Master password | Never stored (only salted hash) | SHA-256 + salt |

### Network Security
- **CSP enabled** in `tauri.conf.json` with restricted `connect-src`
- **Allowed external connections:**
  - Val.town issue reporter endpoint
  - Val.town consent log endpoint
  - Anthropic API (AI features, user-initiated)
  - OpenAI API (AI features, user-initiated)
  - jsdelivr CDN (Monaco editor)
- **No telemetry** — no background data collection
- **All consent/report endpoints** are proxied through Val.town (no direct GitHub token exposure)

### App Sandbox (macOS)
Enabled via `Entitlements.plist`:
| Entitlement | Purpose |
|-------------|---------|
| `com.apple.security.app-sandbox` | App sandboxing |
| `com.apple.security.network.client` | Error reporting, AI APIs |
| `com.apple.security.automation.apple-events` | Paste simulation (Cmd+V) |
| `com.apple.security.files.user-selected.read-write` | Export/import data |
| `com.apple.security.cs.allow-unsigned-executable-memory` | WebView/Tauri runtime |

### Brute-Force Protection
Vault unlock attempts are rate-limited with exponential backoff:
| Failed Attempts | Delay |
|----------------|-------|
| 3 | 3 seconds |
| 5 | 10 seconds |
| 7 | 30 seconds |
| 10+ | 60 seconds |

---

## Consent & Legal

### EULA (End User License Agreement)
- Shown on first launch, blocks app until accepted
- Must scroll to end before "I Accept" button is enabled
- Acceptance recorded: local audit log + server (GitHub issue)
- Server confirmation required — no internet = cannot accept
- Stored in `settings.json`: `eulaAccepted`, `eulaAcceptedVersion`, `eulaAcceptedAt`
- One-time only — not shown again after acceptance

### AI Data Processing Consent
- Required before using any AI feature
- 3 explicit checkboxes must be checked
- Server confirmation required
- Can be revoked anytime in Settings
- Recorded with SHA-256 integrity hash

### Error Reporting
- Opt-in only (default OFF)
- Shown after EULA acceptance on first launch
- Can be toggled anytime in Settings
- Rate limited: 10/hour, 50/day
- No clipboard/vault/personal data sent

### Privacy Policy
- Accessible from Settings → "Privacy Policy"
- Describes data handling, storage, third-party services

---

## App Store Requirements

### Apple Privacy Manifest (`PrivacyInfo.xcprivacy`)
Required since Spring 2024. Declares:
- **Required Reason APIs** used by the app
- **Tracking** declaration (NO tracking)
- **Data collection** types

### Info.plist Usage Descriptions
| Key | Description | Required For |
|-----|-------------|-------------|
| `NSAppleEventsUsageDescription` | Paste simulation | Accessibility permission dialog |

### App Store Data Collection Disclosure
When submitting to App Store Connect, declare:

| Data Type | Collected | Linked to User | Tracking |
|-----------|-----------|----------------|----------|
| Crash Data | Yes (opt-in) | No | No |
| Performance Data | No | — | — |
| Clipboard Data | Local only | No | No |
| Identifiers | No | — | — |
| Usage Data | No | — | — |
| Contact Info | No | — | — |

---

## Dev Mode

All external reporting is disabled in development:
```typescript
if (import.meta.env.DEV) return; // skip in development
```

Applied to:
- `errorReporter.ts` — auto error reports
- `feedbackStore.ts` — manual issue reports
- `consentLog.ts` — server-side consent logging (local log still works)

---

## Security Audit Checklist

### Cryptography
- [x] AES-256-GCM for vault encryption
- [x] PBKDF2 with 210K iterations for key derivation (legacy 100K auto-migrated)
- [x] Random salt (16 bytes) and IV (12 bytes) per operation
- [x] Salted password hashing (not plain SHA-256)
- [x] No spread operator overflow on large arrays
- [x] Constant-time password comparison (prevents timing attacks)

### Input Validation
- [x] Vault form validation (Luhn, IBAN, SWIFT, email)
- [x] Input length limits on all form fields
- [x] SQL parameterized queries (no injection)
- [x] CSP prevents XSS

### Access Control
- [x] App Sandbox enabled
- [x] Vault brute-force protection
- [x] Vault auto-lock timer
- [x] Sensitive data detection (API keys, passwords, tokens, PEM keys, financial data)

### Data Protection
- [x] No clipboard content sent to external servers (except user-initiated AI)
- [x] Vault data encrypted at rest
- [x] AI actions blocked for sensitive items
- [x] Export/import uses file picker (sandboxed)
- [x] Stack trace sanitization in error reports (no absolute paths)
- [x] Enhanced sensitive pattern detection (JSON/YAML/env formats, Slack/SendGrid/GitHub OAuth tokens)

### Network
- [x] CSP with restricted connect-src
- [x] HTTPS only for all external connections
- [x] No direct GitHub token in client
- [x] Consent requires server confirmation

### Compliance
- [x] EULA with server-recorded acceptance
- [x] AI consent with 3 explicit checkboxes
- [x] Error reporting opt-in (not opt-out)
- [x] Privacy Policy accessible in-app
- [x] PrivacyInfo.xcprivacy for App Store

---

## Security Audit Results (2026-02-23)

### Findings & Fixes Applied

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Password comparison used `===` (timing attack vector) | High | **Fixed** — `timingSafeEqual()` in `encryption.ts` |
| 2 | Stack traces exposed absolute file paths in error reports | Medium | **Fixed** — `sanitizeStack()` in `errorReporter.ts` |
| 3 | Error hash used truncated base64 (collision risk) | Low | **Fixed** — proper numeric hash in `errorReporter.ts` |
| 4 | Sensitive patterns missed JSON/YAML/env formats | Medium | **Fixed** — quoted key support in `formatDetector.ts` |
| 5 | Missing detection for Slack, SendGrid, GitHub OAuth tokens | Medium | **Fixed** — added `xox*`, `SG.*`, `gho_*` patterns |
| 6 | Missing EC/OPENSSH private key detection | Low | **Fixed** — extended PEM regex in `formatDetector.ts` |
| 7 | Missing database URL / connection string detection | Medium | **Fixed** — added patterns in `formatDetector.ts` |

### Accepted Risks (No Action Required)
- **PBKDF2 210K iterations**: NIST recommends 210K+ for SHA-256. Current level meets the standard. Higher iterations (600K+) would degrade UX on mobile/low-power devices.
- **Clipboard history in plaintext**: By design — sensitive items are flagged and users are warned. Vault exists for truly sensitive data.
- **Local SQLite without encryption**: Covered by macOS App Sandbox + file system permissions. Full-database encryption (SQLCipher) would add complexity without meaningful benefit for local-only data.
