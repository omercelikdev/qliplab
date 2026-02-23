# Reporting & Consent System

QlipLab uses GitHub Issues as the backend for all reporting and consent tracking, proxied through Val.town endpoints.

---

## Architecture

```
App → Val.town Proxy → GitHub Issues API → Private Repo Issues
```

All endpoints are stateless proxies — no data stored on Val.town. GitHub Issues serve as the permanent audit trail.

---

## Endpoints

| Endpoint | Config Key | Purpose |
|----------|-----------|---------|
| Issue Reporter | `CONFIG.ISSUE_REPORTER_URL` | User reports + auto error reports |
| Consent Log | `CONFIG.CONSENT_LOG_URL` | EULA acceptance + AI consent records |

Both URLs are configured in `src/lib/config.ts`.

---

## 4 Issue Categories

### 1. EULA Acceptance Records

**When:** User accepts the End User License Agreement on first launch.

**Labels:** `consent-log`, `consent:grant`, `eula`, `terms:v{version}`

**Title format:** `✅ [EULA] grant · EULA · terms v1.0`

**Body includes:**
- Consent ID (unique per record)
- Timestamp (client + server)
- EULA version + text preview
- Platform, locale, app version
- SHA-256 integrity hash

**Source:** `src/lib/consentLog.ts` → `recordConsent('grant', 'eula', ...)`

**Search:**
```
label:eula                          → all EULA acceptances
label:eula label:consent:grant      → granted EULAs only
label:eula "v1.0"                   → specific EULA version
```

---

### 2. AI Consent Records

**When:** User enables AI features in Settings (requires 3 checkboxes).

**Labels:** `consent-log`, `consent:grant` or `consent:revoke`, `terms:v{version}`

**Title format:** `✅ [Consent] grant · anthropic · terms v1.0.0`

**Body includes:**
- 3 explicit consent terms listed
- Provider (Anthropic/OpenAI)
- SHA-256 integrity hash
- Full audit trail

**Source:** `src/lib/consentLog.ts` → `recordConsent('grant', provider)`

**Search:**
```
label:consent-log -label:eula       → AI consents only
label:consent-log label:consent:grant -label:eula → AI grants only
label:consent:revoke                → revoked consents
label:"terms:v1.0.0"               → specific terms version
```

---

### 3. Auto Error Reports

**When:** Unhandled exceptions occur (user must opt-in first).

**Labels:** `auto-reported`, `bug`, `error` | `warning` | `critical`

**Title format:** `[Auto] unhandled_exception: {message first 50 chars}`

**Body includes:**
- Error message + stack trace
- Component/action/route context
- System info (OS, app version)

**Protections:**
- Opt-in only (default OFF)
- Rate limited: 10/hour, 50/day
- Duplicate suppression: 60s window
- No clipboard/vault content sent

**Source:** `src/lib/errorReporter.ts` → `reportError(error, context)`

**Search:**
```
label:auto-reported                 → all auto errors
label:auto-reported label:critical  → critical errors only
label:auto-reported "Maximum update" → specific error type
```

---

### 4. User Manual Reports

**When:** User submits feedback via Settings → "Report Issue / Send Feedback".

**Labels:** `user-reported` + type label + priority label

**Type labels:**
| Type | Labels |
|------|--------|
| Bug | `bug`, `user-reported` |
| Feature | `enhancement`, `user-reported` |
| Question | `question`, `user-reported` |
| Other | `user-reported` |

**Priority labels:** `priority: low`, `priority: medium`, `priority: high`, `priority: critical`

**Title format:** `[Bug] {user title}` or `[Feature] {user title}`

**Source:** `src/stores/feedbackStore.ts` → `submitIssue(data)`

**Search:**
```
label:user-reported                 → all user reports
label:user-reported label:bug       → user-reported bugs
label:"priority: high"              → high priority items
label:enhancement                   → feature requests
```

---

## Label Reference

| Label | Category | Color |
|-------|----------|-------|
| `consent-log` | All consent records | — |
| `consent:grant` | Consent granted | — |
| `consent:revoke` | Consent revoked | — |
| `eula` | EULA acceptance | — |
| `terms:v{x}` | Terms version | — |
| `auto-reported` | Auto error reports | — |
| `user-reported` | Manual user reports | — |
| `bug` | Bug reports | — |
| `enhancement` | Feature requests | — |
| `question` | Questions | — |
| `priority: low/medium/high/critical` | Priority level | — |
| `error/warning/critical` | Error severity | — |

---

## Dev Mode

In development (`npm run tauri dev`), all external reporting is disabled:
- Auto error reports → skipped
- Manual issue reports → skipped
- Consent server calls → skipped (local audit log still written)

This prevents development noise from creating GitHub issues. Controlled via `import.meta.env.DEV`.

---

## Consent Flow

```
First Launch
  ├─ EULA Dialog (scroll to end required)
  │   ├─ Accept → recordConsent('grant', 'eula') → server required
  │   └─ Decline → app closes
  │
  ├─ Error Reporting Opt-in (500ms after EULA)
  │   ├─ Enable → autoErrorReporting = true
  │   └─ No Thanks → autoErrorReporting = false (default)
  │
  └─ App ready

Settings
  ├─ AI Consent → recordConsent('grant', provider) → server required
  ├─ Toggle auto error reporting → immediate
  └─ Manual report → submitIssue() → best-effort
```

---

## Val.town Endpoint Code

Source files for the Val.town proxy functions:
- `scripts/valtown/consent-log.ts` — Consent & EULA endpoint
- Issue reporter endpoint — (same pattern, creates GitHub issues)

---

## Integrity Verification

All consent records include a SHA-256 hash covering:
- consent ID, action, terms version, terms text
- provider, timestamp, app version, platform, locale

Local verification: `src/lib/consentLog.ts` → `verifyRecord(record)`

The hash can be independently computed from the local `consent-audit.json` and compared with the GitHub issue record.
