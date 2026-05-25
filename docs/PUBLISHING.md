# App Store Publishing Guide

Bu doküman QlipLab'in macOS App Store, Microsoft Store ve Linux dağıtımları için yayınlama sürecini kapsar.

---

## 1. macOS App Store

### 1.1 Ön Gereksinimler

| Gereksinim | Durum | Not |
|-----------|-------|-----|
| Apple Developer Program ($99/yıl) | Gerekli | https://developer.apple.com/programs/ |
| Xcode (en son sürüm) | Gerekli | Code signing + notarization için |
| App Store Connect hesabı | Gerekli | Developer Program ile birlikte gelir |
| D-U-N-S Number (şirket ise) | Opsiyonel | Bireysel yayıncı için gerekmez |

### 1.2 App Store Connect Metadata

Aşağıdaki bilgiler App Store Connect'te doldurulacak:

#### Temel Bilgiler

| Alan | Değer |
|------|-------|
| **App Name** | QlipLab |
| **Bundle ID** | `com.qliplab.app` |
| **SKU** | `qliplab-macos` |
| **Primary Language** | English (U.S.) |
| **Version** | 0.1.0 |
| **Build** | Tauri build çıktısından otomatik |
| **Copyright** | © 2026 Ömer Çelik. All rights reserved. |
| **Category** | Utilities → Productivity |
| **Content Rights** | Does not contain third-party content |

#### App Description (Short — Subtitle)

```
Smart clipboard manager with format detection, transforms & encrypted vault.
```

#### App Description (Full)

```
QlipLab is a powerful clipboard manager that goes beyond simple copy-paste history.

SMART CLIPBOARD HISTORY
• Automatically captures everything you copy
• Pin important items for quick access
• Search through your entire clipboard history
• Auto-detects formats: JSON, JWT, Base64, URL, SQL, XML, YAML, and more

INTELLIGENT TRANSFORMS
• One-click beautify, decode, and encode
• JSON formatting, Base64 decode, JWT inspection
• URL decode/encode, SQL formatting
• Chain multiple transforms together

SIDE-BY-SIDE DIFF
• Compare any two clipboard items instantly
• Visual diff with additions, deletions, and changes
• Perfect for code reviews and text comparison

CODE SNIPPETS
• Save reusable code and text blocks
• Organize by category with syntax highlighting
• Template variables: {date}, {time}, {clipboard}, {uuid}
• Trigger-based auto-expansion

SECURE VAULT
• AES-256-GCM encryption for sensitive data
• Store cards, bank details, addresses, personal info
• Master password with brute-force protection
• Auto-lock with configurable timeout

AI-POWERED ACTIONS (Optional)
• Summarize, fix grammar, translate text
• Explain code, change tone
• Requires your own API key (Anthropic or OpenAI)
• Explicit consent required — your data, your choice

PRIVACY FIRST
• All data stored locally on your device
• No telemetry, no tracking, no background data collection
• Clipboard content never sent to our servers
• Optional crash reporting (opt-in only)

KEYBOARD-DRIVEN
• Cmd+Shift+V: Toggle window
• Option+D: Compare mode
• Arrow keys + Enter: Navigate and paste
• Instant paste to your active app
```

#### Keywords (100 character limit)

```
clipboard,manager,copy,paste,history,snippets,vault,encrypt,diff,transform,json,base64,productivity
```

#### Support URL

```
https://github.com/omercelikdev/qliplab/issues
```

#### Marketing URL (opsiyonel)

```
https://github.com/omercelikdev/qliplab
```

### 1.3 Screenshots (Zorunlu)

App Store en az **3 screenshot** gerektirir. Desteklenen çözünürlükler:

| Cihaz | Çözünürlük | Zorunlu |
|-------|-----------|---------|
| Mac (16" Retina) | 2880 × 1800 veya 1600 × 1000 | En az 1 tane |
| Mac (13" Retina) | 2560 × 1600 veya 1280 × 800 | Opsiyonel |

**Önerilen screenshot sırası:**

1. **Clipboard History** — Ana ekran, format badge'leri görünür
2. **Transform View** — JSON beautify veya Base64 decode örneği
3. **Diff Mode** — İki item karşılaştırma
4. **Snippets** — Kod snippet'leri listesi
5. **Vault** — Kilitli vault ekranı (şifreleme vurgusu)
6. **Settings** — Temiz ayarlar paneli

> **İpucu:** Gerçek içerik yerine örnek/demo veriler kullan. Kişisel bilgi olmamalı.

### 1.4 Age Rating

Apple'ın yaş derecelendirme anketi:

| Soru | Cevap |
|------|-------|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Profanity or Crude Humor | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | None |
| Alcohol, Tobacco, or Drug Use | None |
| Simulated Gambling | None |
| Sexual Content or Nudity | None |
| Unrestricted Web Access | No |
| Gambling with Real Currency | No |

**Sonuç:** Rated 4+ (Everyone)

### 1.5 App Privacy (Data Collection)

App Store Connect'te "App Privacy" sekmesinde doldurulacak:

#### Collect Data?
**Yes** — Sadece crash data (opt-in)

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|-----------|-----------|----------------|-------------------|---------|
| Crash Data | Yes | No | No | App Functionality |
| Performance Data | No | — | — | — |
| Other Diagnostic Data | No | — | — | — |
| Identifiers | No | — | — | — |
| Usage Data | No | — | — | — |
| Contact Info | No | — | — | — |
| Location | No | — | — | — |
| Purchases | No | — | — | — |
| Financial Info | No | — | — | — |
| Health & Fitness | No | — | — | — |
| Browsing History | No | — | — | — |
| Search History | No | — | — | — |
| Sensitive Info | No | — | — | — |

### 1.6 Code Signing & Build

```bash
# 1. Xcode'da signing ayarla
#    - Apple Developer hesabıyla giriş
#    - Provisioning profile oluştur (App Store distribution)

# 2. Tauri build (macOS universal binary)
npm run tauri build -- --target universal-apple-darwin

# 3. Build çıktısı:
#    src-tauri/target/universal-apple-darwin/release/bundle/dmg/QlipLab_0.1.0_universal.dmg
#    src-tauri/target/universal-apple-darwin/release/bundle/macos/QlipLab.app

# 4. Notarize (Xcode veya altool ile)
xcrun notarytool submit QlipLab.app.zip \
  --apple-id "your@email.com" \
  --team-id "TEAM_ID" \
  --password "app-specific-password" \
  --wait

# 5. App Store Connect'e yükle
xcrun altool --upload-app \
  -f QlipLab.pkg \
  -t macos \
  -u "your@email.com" \
  -p "app-specific-password"
```

> **Not:** Tauri v2 `tauri-cli` ile `tauri build` komutu `.app` bundle oluşturur. App Store için bunu `.pkg` formatına çevirmen gerekebilir: `productbuild --sign "3rd Party Mac Developer Installer" --component QlipLab.app /Applications QlipLab.pkg`

### 1.7 Review Notes (Apple Reviewer İçin)

App Store Connect → **"App Review Information" → "Notes"** alanına aşağıdaki metin yazılacak.

> **Önemli:** Apple reviewer bu notu doğrudan okur. Her entitlement için neden gerektiğini, benzer onaylanmış uygulamaları ve guideline referanslarını içerir. Bu not profesyonel ve teknik olmalı.

```
QlipLab is a clipboard manager utility — similar in concept to Raycast,
Alfred, Maccy, and Paste, which are all available on the Mac App Store.
It provides clipboard history, format detection, text transforms, and an
encrypted vault for sensitive data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTITLEMENT JUSTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1) com.apple.security.app-sandbox: TRUE
   Standard requirement for Mac App Store distribution.

2) com.apple.security.network.client: TRUE
   Required for:
   - Optional crash reporting (opt-in, disabled by default)
   - Optional AI text processing (user must provide their own API key
     from Anthropic or OpenAI, explicit consent required before first use)
   - EULA acceptance audit logging (one-time on first launch)
   All connections use HTTPS exclusively. No background network activity.
   No telemetry. No analytics. No tracking.

3) com.apple.security.automation.apple-events: TRUE
   Core functionality: When a user selects a clipboard item, the app
   pastes it into their previously active application by:
   (a) Writing the selected text to the system clipboard
   (b) Hiding the QlipLab panel
   (c) Activating the previous application via AppleScript
   (d) Simulating Cmd+V keystroke via CGEvent
   This is the standard clipboard manager "paste-back" pattern used by
   Raycast, Alfred, Maccy, Paste, and CopyClip — all approved on the
   Mac App Store. NSAppleEventsUsageDescription is declared in Info.plist.

4) com.apple.security.temporary-exception.apple-events
   → Target: com.apple.systemevents
   Required to activate the previously focused application before pasting.
   The app calls "tell application [name] to activate" to bring the
   user's previous app to front. Only the app name is used (sanitized
   with whitelist: alphanumeric, spaces, dashes, dots, underscores).
   No other System Events features are used.

5) com.apple.security.files.user-selected.read-write: TRUE
   Used for two user-initiated features:
   - Export: Save clipboard history/snippets as JSON file (via NSSavePanel)
   - Import: Load previously exported data (via NSOpenPanel)
   Both use the standard macOS file picker dialog. No arbitrary file access.

6) com.apple.security.cs.allow-unsigned-executable-memory: TRUE
   Required by the Tauri v2 framework runtime. Tauri uses WKWebView for
   rendering, and the embedded JavaScript engine requires this entitlement
   for JIT compilation. This is a known Tauri framework requirement
   documented at: https://v2.tauri.app/distribute/macos/
   Other Tauri-based apps on the Mac App Store use this same entitlement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NSPanel / FLOATING WINDOW BEHAVIOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QlipLab uses NSPanel to create a Spotlight-like floating panel:
- Activates via global hotkey Cmd+Shift+V
- Appears above all windows on the current Space
- Does NOT appear in the Dock or App Switcher
- Visible on all workspaces (Spaces)
- Dismisses when clicking outside or pressing Escape

This is the standard UX pattern for clipboard managers on macOS.
Raycast (Mac App Store), Alfred, and Spotlight itself use the same
NSPanel approach for instant-access utility panels.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIVACY & DATA HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- ALL clipboard data is stored locally in SQLite within the app sandbox
- Vault items are encrypted with AES-256-GCM (PBKDF2, 210K iterations)
- NO clipboard content is ever transmitted to external servers
- Crash reporting is opt-in (disabled by default), only stack traces
  are sent (no user data, no clipboard content, no vault data)
- AI features require explicit user consent + user's own API key
- AI actions are blocked for items detected as sensitive (passwords,
  API keys, credit card numbers)
- Privacy manifest (PrivacyInfo.xcprivacy) declares all accessed APIs
- Comprehensive privacy policy accessible in Settings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LEGAL & CONSENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- EULA shown on first launch (must scroll to bottom + accept)
- EULA acceptance recorded on server with integrity hash
- AI data processing consent (3 explicit checkboxes, revocable)
- Error reporting opt-in dialog shown after EULA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTING INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No login or account required. No demo credentials needed.

1. Launch QlipLab → EULA dialog appears → scroll to bottom → "I Accept"
2. Error reporting opt-in appears → accept or decline (both OK)
3. Open any text editor (TextEdit, Notes, etc.) and copy some text
4. Press Cmd+Shift+V → QlipLab panel appears with your copied text
5. Click the item → panel hides and text is pasted into the editor
6. Copy a JSON string like {"name":"test"} → format badge appears
7. Click the item → preview panel shows formatted/beautified JSON
8. Try Option+D to enter Diff Mode → select 2 items → see comparison
9. Switch to Snippets tab → create a new snippet
10. Switch to Vault tab → set a master password → add a card/bank item
11. Lock the vault → unlock with your password
12. Settings tab → review all privacy controls, toggle options
13. Settings → "Privacy Policy" shows in-app privacy policy
14. Settings → "Terms of Use" shows EULA

All features work offline except: crash reporting, AI features,
and EULA/consent audit logging (first launch only).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPARABLE APPROVED APPS (Same patterns/entitlements)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Raycast (Mac App Store) — floating panel, paste-back, AppleScript
- Paste - Clipboard Manager (Mac App Store) — clipboard history, paste-back
- Maccy (Mac App Store) — clipboard manager, hotkey, paste simulation
- CopyClip 2 (Mac App Store) — clipboard history, AppleScript paste
```

### 1.8 Apple Guideline Referansları

Review notes'ta bahsedilen her yetki Apple'ın kendi guideline'larıyla uyumlu:

| Guideline | Kural | QlipLab Durumu |
|-----------|-------|---------------|
| **2.5.1** | Apps may only use public APIs | NSPanel + CGEvent standart macOS API'ları. `macos-private-api` Tauri framework flag'i — actual private API çağrısı yok, sadece NSPanel window level ayarı. |
| **2.5.4** | Apps should not download or install executable code | Uygulama çalıştırılabilir kod indirmiyor. `unsafe-eval` sadece Tauri WKWebView JIT için. |
| **2.5.9** | Apps requesting Accessibility API must explain | AppleScript paste simulation açıklanmış, usage description mevcut. |
| **5.1.1** | Data collection must be disclosed | Privacy manifest + in-app privacy policy + data collection anketi |
| **5.1.2** | Data use and sharing must have consent | EULA + AI consent (3 checkbox, server-recorded) + error reporting opt-in |
| **3.2.2(f)** | Utilities must have sufficient functionality | 6+ farklı özellik: history, transforms, diff, snippets, vault, AI |

### 1.9 Rejection Risks & Response Strategy

| Risk | Olasılık | Apple'ın Sorusu | Hazır Cevap |
|------|---------|----------------|-------------|
| NSPanel kullanımı | Orta | "Why does your app use NSPanel?" | "Spotlight-like utility panel UX — same as Raycast, Paste, Maccy on the Mac App Store. Required for instant-access clipboard manager that doesn't appear in Dock." |
| `allow-unsigned-executable-memory` | Orta | "Why is this entitlement needed?" | "Tauri v2 framework requirement for WKWebView JIT. Documented at tauri.app/distribute/macos. Other Tauri apps approved on MAS use the same entitlement." |
| AppleScript automation | Düşük | "Why does the app need Apple Events?" | "Clipboard manager paste-back: activate previous app + simulate Cmd+V. Standard pattern used by Raycast, Alfred, Maccy, CopyClip. Usage description in Info.plist." |
| System Events exception | Düşük | "Why target com.apple.systemevents?" | "Activate the user's previously focused app by name before pasting. Only 'activate' command is used. App name is whitelist-sanitized." |
| Network access | Çok düşük | "What network calls does the app make?" | "All opt-in: crash reporting (disabled by default), AI features (user's own API key + consent), EULA audit (one-time). HTTPS only. No telemetry." |

### 1.10 Eğer Reddedilirse — Appeal Template

Resolution Center'da veya App Review Board appeal'ında kullanılacak şablon:

```
Dear App Review Team,

Thank you for your feedback regarding QlipLab.

Regarding [SPECIFIC REJECTION REASON]:

QlipLab is a clipboard manager utility in the same category as several
approved Mac App Store applications including:
- Raycast (currently on the Mac App Store)
- Paste - Clipboard Manager (currently on the Mac App Store)
- Maccy (currently on the Mac App Store)
- CopyClip 2 (currently on the Mac App Store)

These apps use the same technical patterns and entitlements that QlipLab
uses:
- NSPanel for floating utility window (Spotlight-like UX)
- AppleScript/CGEvent for paste simulation into the previous app
- App Sandbox with the same entitlements

[SPECIFIC TECHNICAL EXPLANATION FOR THE REJECTION REASON]

We believe QlipLab complies with App Store Review Guideline [X.X.X]
because [EXPLANATION].

We are happy to provide additional technical details, make adjustments,
or schedule a call with the App Review Board to discuss our implementation.

Best regards,
Ömer Çelik
QlipLab Developer
```

> **Red durumunda:** Apple genellikle spesifik sebep belirtir. İlk submission'da reddedilirse, Review Board'a appeal yapılabilir. NSPanel kullanımı için "Spotlight-like utility" categorization önerilir.

---

## 2. Microsoft Store

### 2.1 Ön Gereksinimler

| Gereksinim | Durum | Not |
|-----------|-------|-----|
| Microsoft Partner Center hesabı | Gerekli | https://partner.microsoft.com/ |
| Bireysel: $19 (tek seferlik) | Gerekli | Şirket: $99 |
| EV Code Signing Certificate | Önerilen | SmartScreen uyarısını engeller |

### 2.2 Partner Center Metadata

| Alan | Değer |
|------|-------|
| **App Name** | QlipLab |
| **Category** | Productivity |
| **Subcategory** | File management |
| **Age Rating** | PEGI 3 / Everyone |
| **Markets** | All markets |
| **Pricing** | Free |
| **Languages** | English (en-US) |

### 2.3 Store Description

Aynı açıklama metni (bkz. 1.2) kullanılabilir. Microsoft Store ek olarak:

- **Short description (100 char):** `Smart clipboard manager with format detection, transforms & encrypted vault.`
- **Features list:** Her feature bullet olarak
- **System requirements:**
  - **OS:** Windows 10 version 1803+ / Windows 11
  - **Architecture:** x64
  - **RAM:** 4 GB minimum
  - **Disk:** 100 MB

### 2.4 Screenshots

| Çözünürlük | Zorunlu |
|-----------|---------|
| 1366 × 768 (minimum) | En az 1 |
| 1920 × 1080 (önerilen) | En az 1 |

Aynı screenshot listesi (bkz. 1.3) uygulanır.

### 2.5 Build & Submit

```bash
# 1. Windows build
npm run tauri build -- --target x86_64-pc-windows-msvc

# 2. Build çıktısı:
#    src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/QlipLab_0.1.0_x64.msi
#    src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/QlipLab_0.1.0_x64-setup.exe

# 3. Code signing (EV certificate ile)
signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 \
  /f certificate.pfx /p PASSWORD QlipLab_0.1.0_x64.msi

# 4. Partner Center'a .msix veya .msi yükle
```

### 2.6 Privacy Policy URL

Microsoft Store bir privacy policy URL'i gerektirir:
- GitHub Pages veya basit bir statik sayfa olarak yayınla
- İçerik: `PrivacyPolicyDialog.tsx` içeriğinin web versiyonu

---

## 3. Linux Dağıtımı

### 3.1 Dağıtım Kanalları

| Kanal | Format | Öncelik |
|-------|--------|---------|
| **Flathub** | Flatpak | Yüksek (en yaygın) |
| **Snap Store** | Snap | Orta |
| **AppImage** | Portable binary | Düşük (doğrudan dağıtım) |
| **AUR** | PKGBUILD | Düşük (Arch Linux) |

### 3.2 AppImage (Varsayılan Tauri Çıktısı)

```bash
# Build
npm run tauri build -- --target x86_64-unknown-linux-gnu

# Çıktı:
#   src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/QlipLab_0.1.0_amd64.AppImage
#   src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/qliplab_0.1.0_amd64.deb
```

### 3.3 Flathub Submission

Flathub'a yayınlamak için bir manifest dosyası gerekir. İleride gerektiğinde hazırlanır.

---

## 4. Yayın Öncesi Kontrol Listesi

### Tüm Platformlar

- [ ] Version numarası tutarlı (`package.json`, `Cargo.toml`, `tauri.conf.json`, `config.ts`)
- [ ] EULA kabul akışı test edildi
- [ ] Privacy Policy erişilebilir (Settings → Privacy Policy)
- [ ] Error reporting opt-in çalışıyor
- [ ] AI consent akışı çalışıyor
- [ ] Vault şifreleme/çözme çalışıyor
- [ ] Tüm keyboard shortcut'lar çalışıyor
- [ ] Screenshot'lar hazırlandı
- [ ] Release notes yazıldı

### macOS Spesifik

- [ ] Apple Developer Program üyeliği aktif
- [ ] Provisioning profile oluşturuldu (App Store distribution)
- [ ] Code signing çalışıyor
- [ ] Notarization geçti
- [ ] Sandbox'ta tüm özellikler çalışıyor (özellikle paste simulation)
- [ ] PrivacyInfo.xcprivacy bundle'a dahil
- [ ] Minimum macOS 12.0'da test edildi
- [ ] Universal binary (arm64 + x86_64) oluşturuldu
- [ ] App Store Connect metadata dolduruldu
- [ ] Review notes yazıldı
- [ ] Screenshots yüklendi (en az 3 adet)
- [ ] App Privacy anketi dolduruldu

### Windows Spesifik

- [ ] Partner Center hesabı oluşturuldu
- [ ] MSI/NSIS installer test edildi
- [ ] Code signing yapıldı (SmartScreen uyarısı engellemek için)
- [ ] Windows 10 1803+ ve Windows 11'de test edildi
- [ ] Privacy policy URL canlı

### Linux Spesifik

- [ ] AppImage çalıştırılabilir
- [ ] .deb paketi test edildi
- [ ] Desktop entry düzgün (icon, kategori, açıklama)

---

## 5. Release Notes (v0.1.0)

```
QlipLab v0.1.0 — First Beta Release

What's New:
• Clipboard History — Auto-captures everything you copy with search and pin
• Format Detection — Automatically identifies JSON, JWT, Base64, URL, SQL, and 15+ formats
• Smart Transforms — One-click beautify, decode, encode with chainable pipelines
• Diff Mode — Compare any two items side-by-side
• Code Snippets — Save and organize reusable text with syntax highlighting
• Secure Vault — AES-256-GCM encrypted storage for sensitive data
• AI Actions — Summarize, translate, fix grammar (requires your own API key)
• Privacy First — All data local, no telemetry, optional crash reporting

System Requirements:
• macOS 12.0 (Monterey) or later
• Windows 10 (1803) or later
• Linux (x86_64, AppImage)
```

---

## 6. Post-Submission

### Apple Review Süreci
- Ortalama review süresi: **24-48 saat** (bazen 1 hafta)
- İlk submission'da red olasılığı: **%30-40** (private API nedeniyle)
- Red durumunda: Resolution Center'dan detay iste, review notes güncelle, tekrar submit et
- Appeal: App Review Board'a yazılı itiraz hakkı var

### Version Güncelleme
Her yeni sürümde:
1. `package.json`, `Cargo.toml`, `tauri.conf.json`, `config.ts` version güncelle
2. CHANGELOG.md'ye değişiklikleri ekle
3. Build + sign + notarize
4. App Store Connect'te yeni version oluştur
5. Release notes yaz
6. Submit for review
