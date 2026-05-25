# qliplab-api (Cloudflare Worker)

QlipLab'in backend proxy'si. Eski Val.town vallerinin yerini alır.
Kod private, `GITHUB_TOKEN` bir Worker secret'ı (asla ifşa olmaz).

## Route'lar

| Route | Kullanım | Gönderilen | Dönen | Depo |
|-------|----------|-----------|-------|------|
| `POST /report` | Otomatik hata + manuel feedback (`errorReporter.ts`, `feedbackStore.ts`) | `{ title, body, labels }` | `{ success, issueNumber, issueUrl }` | GitHub Issues |
| `POST /consent` | AI/EULA onay kaydı (`consentLog.ts`) | `{ consentId, action, termsVersion, ... }` | `{ success, id }` | **D1 (consent_log)** |

Consent PII'si **D1'e** yazılır (GitHub Issues'a değil). Bug-report'lar GitHub Issues'a gider (orası doğru yer).

## Kurulum (tek seferlik — sıra önemli)

```bash
cd worker
npm install
npx wrangler login

# 1) D1 veritabanını oluştur, çıktıdaki database_id'yi wrangler.toml'a yapıştır
npx wrangler d1 create qliplab
#    → wrangler.toml içindeki database_id = "PASTE_AFTER_CREATE" satırını güncelle

# 2) Şemayı uzak D1'e uygula
npx wrangler d1 execute qliplab --remote --file=schema.sql

# 3) GitHub token'ını secret olarak ekle (fine-grained PAT, Issues: read/write)
npx wrangler secret put GITHUB_TOKEN

# 4) Deploy
npx wrangler deploy
```

> Sırayı atlama: `database_id` yapıştırılmadan `deploy` çalışmaz.

`deploy` sonrası URL şuna benzer olur:
`https://qliplab-api.<senin-subdomain>.workers.dev`

Bu URL'i bana ver → `src/lib/config.ts` ve `tauri.conf.json` CSP'ye bağlarım:
- `ISSUE_REPORTER_URL` → `.../report`
- `CONSENT_LOG_URL`   → `.../consent`

## GITHUB_TOKEN izinleri

Fine-grained Personal Access Token, sadece `omercelikdev/qliplab` reposunda
**Issues: Read and write**. Başka izne gerek yok.

## Consent kayıtlarını sorgulama / yedek

```bash
# Tüm onaylar
npx wrangler d1 execute qliplab --remote --command "SELECT * FROM consent_log ORDER BY id DESC LIMIT 50"
# CSV export (yedek / yasal rapor)
npx wrangler d1 execute qliplab --remote --command "SELECT * FROM consent_log" --json > consent-backup.json
```

## Geliştirme

```bash
npm run dev        # yerel (yerel D1 kullanır)
npm run typecheck  # tsc --noEmit
npm run tail       # canlı log
```
