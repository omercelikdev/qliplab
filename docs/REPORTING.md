# Reporting System

QlipLab reports bugs and feedback to GitHub Issues through a small Cloudflare
Worker (`worker/src/index.ts`, live at `qliplab-api.omercelikdev.workers.dev`).
The Worker is a stateless proxy — it holds the GitHub token as a secret and
creates issues on the user's behalf. Nothing is stored on the Worker except a
short-lived per-IP rate-limit counter in D1.

> **No consent tracking of any kind.** QlipLab is free & open source, has no
> cloud component, and never records an agreement anywhere. Clipboard content
> never leaves the device.

---

## Architecture

```
App → Cloudflare Worker (/report) → GitHub Issues API → Repo Issues
```

All requests carry a soft `X-App-Token` header and are per-IP rate limited.

---

## Endpoint

| Endpoint | Config Key | Purpose |
|----------|-----------|---------|
| Issue Reporter | `CONFIG.ISSUE_REPORTER_URL` | User reports + auto error reports |

Configured in `src/lib/config.ts`.

---

## Report Categories

### 1. Auto Error Reports

**When:** Unhandled exceptions occur (user must opt-in first; default OFF).

**Labels:** `auto-reported`, `bug`, `error` | `warning` | `critical`

**Title format:** `[Auto] unhandled_exception: {message first 50 chars}`

**Body includes:** error message + sanitized stack trace, component/action/route
context, system info (OS, app version).

**Protections:**
- Opt-in only (default OFF)
- Rate limited: 10/hour, 50/day (client) + per-IP limit (Worker)
- Duplicate suppression: 60s window
- No clipboard/vault content sent

**Source:** `src/lib/errorReporter.ts` → `reportError(error, context)`

### 2. User Manual Reports

**When:** User submits feedback via Settings → "Report Issue / Send Feedback".

**Labels:** `user-reported` + type label + priority label

| Type | Labels |
|------|--------|
| Bug | `bug`, `user-reported` |
| Feature | `enhancement`, `user-reported` |
| Question | `question`, `user-reported` |
| Other | `user-reported` |

**Priority labels:** `priority: low/medium/high/critical`

**Source:** `src/stores/feedbackStore.ts` → `submitIssue(data)`

---

## Dev Mode

In development (`npm run tauri dev`), external reporting is disabled via
`import.meta.env.DEV`:
- Auto error reports → skipped
- Manual issue reports → skipped

This prevents development noise from creating GitHub issues.
