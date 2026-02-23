/**
 * Val.town Consent Log Endpoint → GitHub Issues (aynı qliplab repo)
 *
 * SETUP (2 dk):
 *   1. Val.town → "New Val" → "HTTP" → bu kodu yapıştır → Save
 *   2. Val.town → Environment Variables:
 *      GITHUB_TOKEN = ghp_xxxxx   (mevcut token yeterli, Issues write izni olsun)
 *      GITHUB_OWNER = celikomr    (kendi username'in)
 *      GITHUB_REPO  = qliplab     (AYNI repo, zaten private)
 *   3. URL'i kopyala → src/lib/config.ts CONSENT_LOG_URL'e yapıştır
 *
 * LABELS (GitHub'da otomatik oluşur):
 *   consent-log         → tüm consent kayıtları
 *   consent:grant       → onay verenler
 *   consent:revoke      → onay geri çekenler
 *   terms:v1.0.0        → hangi terms versiyonu kabul edildi
 *
 * SEARCH (GitHub Issues):
 *   label:consent-log                     → tüm consent'ler
 *   label:consent-log label:consent:grant → sadece onaylayanlar
 *   label:consent-log "2026-02"           → Şubat kayıtları
 *   label:"terms:v1.0.0"                  → v1.0.0 kabul edenler
 *
 * Error reporter ile AYNI pattern. Ayrı endpoint = bağımsız çalışır.
 * COST: $0
 */

export default async function(req: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  }

  try {
    const body = await req.json();

    // ── Validate ──
    const required = ["consentId", "action", "termsVersion", "provider", "timestamp", "appVersion", "integrityHash"];
    for (const f of required) {
      if (!body[f]) {
        return new Response(JSON.stringify({ success: false, error: `Missing: ${f}` }), { status: 400, headers: cors });
      }
    }
    if (!["grant", "revoke"].includes(body.action)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), { status: 400, headers: cors });
    }

    // ── Labels ──
    const labels = [
      "consent-log",                           // ana filtre
      `consent:${body.action}`,                 // grant veya revoke
      `terms:v${body.termsVersion}`,            // hangi terms versiyonu
    ];

    // ── Issue title ──
    const icon = body.action === "grant" ? "✅" : "❌";
    const title = `${icon} [Consent] ${body.action} · ${body.provider} · terms v${body.termsVersion}`;

    // ── Issue body — tam hukuki kayıt ──
    const termsText = Array.isArray(body.termsText)
      ? body.termsText.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")
      : "N/A";

    const issueBody = `## AI Data Processing Consent Record

### Event
| Field | Value |
|:------|:------|
| **Consent ID** | \`${body.consentId}\` |
| **Action** | **${body.action.toUpperCase()}** ${icon} |
| **Date & Time** | ${body.timestamp} |
| **Server Received** | ${new Date().toISOString()} |

### Terms Accepted (v${body.termsVersion})
The user explicitly checked each of the following statements:

${termsText}

### Context
| Field | Value |
|:------|:------|
| **AI Provider** | ${body.provider} |
| **App Version** | ${body.appVersion} |
| **Platform** | ${body.platform || "N/A"} |
| **Locale** | ${body.locale || "N/A"} |

### Integrity Verification
| Field | Value |
|:------|:------|
| **SHA-256 Hash** | \`${body.integrityHash}\` |
| **Hash covers** | consent ID, action, terms version, terms text, provider, timestamp, app version, platform, locale |

> **Legal note:** This consent was recorded automatically when the user explicitly
> checked 3 required checkboxes and clicked "I Accept — Enable AI" in the QlipLab
> application. The integrity hash can be independently verified against the
> local consent-audit.json on the user's device.

---
*Recorded by qliplab consent audit system · ${new Date().toISOString()}*`;

    // ── Create GitHub Issue ──
    const ghRes = await fetch(
      `https://api.github.com/repos/${Deno.env.get("GITHUB_OWNER")}/${Deno.env.get("GITHUB_REPO")}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body: issueBody, labels }),
      },
    );

    if (!ghRes.ok) {
      const err = await ghRes.text();
      console.error("GitHub API error:", err);
      return new Response(
        JSON.stringify({ success: false, error: `GitHub ${ghRes.status}` }),
        { status: 502, headers: cors },
      );
    }

    const issue = await ghRes.json();

    return new Response(
      JSON.stringify({ success: true, consentId: body.consentId, issueNumber: issue.number }),
      { status: 200, headers: cors },
    );
  } catch (error) {
    console.error("Consent endpoint error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: cors },
    );
  }
}
