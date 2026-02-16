# QlipLab — Comprehensive Analysis & Finalization Report

> Generated: 2026-02-16 | Codebase version: 0.1.0 | Branch: main

---

## Table of Contents

1. [Feature Audit](#1-feature-audit)
2. [Security Report](#2-security-report)
3. [Type Audit](#3-type-audit)
4. [Competitive Analysis](#4-competitive-analysis)
5. [Feature Proposals](#5-feature-proposals)
6. [Implementation Plan](#6-implementation-plan)
7. [Store Publishing Blockers](#7-store-publishing-blockers)
8. [Store Publishing Warnings](#8-store-publishing-warnings)
9. [UX/UI & Architecture Improvements](#9-uxui--architecture-improvements)

---

## 1. Feature Audit

### 1.1 Feature Matrix

| # | Feature | Status | Frontend Files | Backend Files | Notes |
|---|---------|--------|---------------|---------------|-------|
| 1 | Clipboard History (text) | **Complete** | `HistoryList.tsx`, `HistoryItem.tsx`, `useClipboardListener.ts` | `lib.rs` | Event-based listener, SQLite persistence |
| 2 | Clipboard History (images) | **Complete** | `HistoryItem.tsx`, `ImageView.tsx`, `imageUtils.ts` | `tauri-plugin-clipboard` | PNG base64 + legacy RGBA |
| 3 | Format Auto-Detection (20+ formats) | **Complete** | `formatDetector.ts`, `FormatIcon.tsx` | — | JSON, JWT, Base64, URL, SQL, XML, HTML, UUID, timestamp, YAML, color, CSV, regex, hex, 7 code languages |
| 4 | Smart Transforms | **Complete** | `ItemMenu.tsx`, `transforms.ts`, `PreviewPanel.tsx` | — | JSON beautify/minify, JWT/Base64/URL decode, SQL format, YAML↔JSON, CSV→JSON, color conversions, Prettier |
| 5 | Diff Mode | **Complete** | `PreviewPanel.tsx` (Monaco DiffEditor), `useDiffMode.ts` | — | Side-by-side + inline, Monaco-based |
| 6 | Snippets | **Complete** | `SnippetList.tsx`, `SnippetItem.tsx`, `NewSnippetDialog.tsx` | — | Create, search, favorite, quick paste |
| 7 | Secure Vault | **Complete** | `VaultList.tsx`, `VaultItem.tsx`, `VaultLock.tsx`, `NewVaultItemDialog.tsx` | — | AES-256-GCM, PBKDF2, 6 item types, auto-lock |
| 8 | Global Shortcut | **Complete** | `useGlobalShortcut.ts`, `window.ts` | `lib.rs` (show_panel/hide_panel) | Cmd+Shift+V |
| 9 | Ditto-like Paste | **Complete** | `window.ts` | `lib.rs` (simulate_paste, save_frontmost_app) | CGEvent on macOS, enigo on Windows |
| 10 | Pin/Favorite Clips | **Complete** | `HistoryItem.tsx`, `historyStore.ts` | — | Toggle pin, pinned sort first |
| 11 | Search | **Complete** | `DragBar.tsx`, all list components | — | Substring match across history, snippets, vault |
| 12 | Settings | **Complete** | `SettingsDialog.tsx`, `settingsStore.ts` | — | Theme, history limit, auto-lock, etc. |
| 13 | Monaco Editor (View/Edit) | **Complete** | `EditorView.tsx`, `PreviewPanel.tsx` | — | Syntax highlighting, editable |
| 14 | Error Reporting | **Complete** | `ReportIssueDialog.tsx`, `ErrorReportingOptIn.tsx`, `errorReporter.ts` | — | Manual + opt-in auto, rate-limited |
| 15 | Theme Support | **Complete** | `useTheme.ts`, `index.css` | — | Light/dark/system |
| 16 | Autostart | **Complete** | `useAutostart.ts` | `lib.rs` (tauri-plugin-autostart) | Auto-enables on first run |
| 17 | Window Management (Panel) | **Complete** | `window.ts`, `ResizeBorder.tsx` | `lib.rs` (init_panel, NSPanel) | Spotlight-like, all spaces |
| 18 | Keyboard Navigation | **Complete** | `useKeyboardNavigation.ts`, `HintBar.tsx` | — | Arrow keys, Enter to paste |

### 1.2 Partial/Broken Features

| # | Feature | Status | Issue |
|---|---------|--------|-------|
| 19 | `historyLimit` setting | **BROKEN** | Setting stored in UI but `historyStore.ts:22` hardcodes `LIMIT 100` — setting value is ignored |
| 20 | `clearHistoryOnQuit` setting | **STUB** | Setting stored in UI but no quit handler implements it — no Tauri lifecycle hook or `beforeunload` |
| 21 | `sensitiveDetectionEnabled` setting | **STUB** | Setting stored in UI but `useClipboardListener.ts` never reads it — `isSensitive()` always runs regardless |
| 22 | `storeImages` setting | **STUB** | Setting stored in UI but `useClipboardListener.ts` never checks it — images always stored |
| 23 | `autoLockMinutes` setting | **BROKEN** | Setting stored in UI but `vaultStore.ts:9` hardcodes `AUTO_LOCK_TIMEOUT = 5 * 60 * 1000` — setting ignored |
| 24 | Snippet Categories | **STUB** | `createCategory()` exists in store but NO UI to create/manage categories |
| 25 | Vault Item Edit | **MISSING** | No update/edit for existing vault items — only create and delete |

### 1.3 Orphaned Code (defined but never imported/used)

| File | Notes |
|------|-------|
| `src/components/layout/TabBar.tsx` | Replaced by `Sidebar.tsx`, never imported |
| `src/components/welcome/WelcomeScreen.tsx` | Never imported or used in app |
| `src/components/preview/DiffView.tsx` | Replaced by Monaco DiffEditor in `PreviewPanel.tsx` |
| `src/components/preview/TransformView.tsx` | Never imported — `EditorView.tsx` handles transform display |
| `src/components/preview/MonacoDiffView.tsx` | Complete but never imported — `PreviewPanel.tsx` embeds Monaco DiffEditor directly |
| `src/lib/diff.ts` | Only imported by the orphaned `DiffView.tsx` |
| `src/assets/react.svg` | Default Vite asset, never used |
| `clearImageCache()` in `imageUtils.ts` | Exported but never called anywhere |
| `getShortcutDisplay()` in `platform.ts` | Exported but never called anywhere |
| `isWindows()`, `isLinux()` in `platform.ts` | Exported but never called anywhere |

---

## 2. Security Report

### 2.1 CRITICAL

| ID | Issue | Location | Description | Fix |
|----|-------|----------|-------------|-----|
| C1 | **CSP disabled** | `tauri.conf.json:31` | `"csp": null` disables Content Security Policy entirely. Any XSS can execute arbitrary scripts, fetch from arbitrary origins, and exfiltrate vault passwords. | Set CSP: `"csp": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://celikomr--*.web.val.run"` |
| C2 | **App Sandbox disabled** | `Entitlements.plist:6` | `com.apple.security.app-sandbox` is `false`. Apple **will reject** for Mac App Store. App has unrestricted filesystem and process access. | Enable sandbox with specific entitlements for accessibility (paste), file access (db), network (error reporting) |

### 2.2 HIGH

| ID | Issue | Location | Description | Fix |
|----|-------|----------|-------------|-----|
| H1 | **Vault password: unsalted SHA-256** | `encryption.ts:50-53` | `hashPassword()` uses a single SHA-256 hash with no salt. Identical passwords produce identical hashes. Vulnerable to rainbow tables. | Use PBKDF2 with unique salt (same as encryption key derivation), or switch to argon2 |
| H2 | **Session password in JS memory** | `vaultStore.ts:8` | `sessionPassword` stored as plain string in module scope. Accessible via devtools and memory dumps. JS cannot securely erase strings. | Minimize exposure time. Consider storing only derived key, not raw password. Wipe ref on lock. |
| H3 | **No auth on error reporting endpoint** | `errorReporter.ts:167` | Public Val.town endpoint with no authentication. Anyone can POST fake crash reports. | Add API key or HMAC signing to requests |
| H4 | **Clipboard stored unencrypted** | `database.ts`, `historyStore.ts` | All clipboard content (including items flagged `is_sensitive=1`) stored as plain text in SQLite. | Either: (a) encrypt sensitive items at rest, (b) don't persist sensitive items, or (c) clearly document this as intentional |
| H5 | **Spread operator on large arrays** | `encryption.ts:36` | `btoa(String.fromCharCode(...combined))` — spread on large arrays causes stack overflow for payloads > ~100KB | Use chunked conversion: `Array.from(combined).map(b => String.fromCharCode(b)).join('')` |

### 2.3 MEDIUM

| ID | Issue | Location | Description |
|----|-------|----------|-------------|
| M1 | SQL results typed as `any[]` | `historyStore.ts:22`, `snippetStore.ts:29,51`, `vaultStore.ts:48,90` | Parameterized queries (good), but `any[]` loses type safety |
| M2 | JWT decoded without signature check | `transforms.ts:36-42` | `decodeJwt()` doesn't verify signatures — appropriate for viewer but should display warning |
| M3 | Error reporter leaks stack traces | `errorReporter.ts:103` | Stack traces sent externally may reveal internal architecture |
| M4 | Prettier in production deps | `package.json:31` | 3.8MB+ library in `dependencies` instead of `devDependencies`, bloats bundle |
| M5 | `withGlobalTauri: true` + no CSP | `tauri.conf.json:14,31` | Exposes Tauri API to webview; combined with disabled CSP, increases attack surface |

### 2.4 LOW

| ID | Issue | Location | Description |
|----|-------|----------|-------------|
| L1 | `navigator.platform` deprecated | `platform.ts:2,6,10` | Should use `navigator.userAgentData` with fallback |
| L2 | No vault brute-force protection | `vaultStore.ts:45-79` | Unlimited password attempts with no delay or lockout |
| L3 | Image cache memory usage | `imageUtils.ts:4` | 50 entries of base64 image data can consume significant memory |
| L4 | Debug console.log in production | Multiple files | `console.log('[Clipboard] ...')` and similar debug logs |

### 2.5 INFO

| ID | Issue | Location |
|----|-------|----------|
| I1 | SQLite db accessible to user-level processes | `database.ts:6` |
| I2 | Capabilities include `sql:allow-execute` | `capabilities/default.json` |
| I3 | `"macOSPrivateApi": true` needed for panel | `tauri.conf.json:13` |

---

## 3. Type Audit

### 3.1 Explicit `any` Usages (Must Fix)

| Location | Current Code | Proposed Fix |
|----------|-------------|-------------|
| `transforms.ts:36` | `{ header: any; payload: any }` | `{ header: Record<string, unknown>; payload: Record<string, unknown> }` |
| `vault.ts:7` | `data: any` | `data: CardData \| BankData \| AddressData \| PersonalData \| CompanyData \| CodeData` |
| `vaultStore.ts:37` | `createItem(..., data: any)` | Match the `VaultItem.data` union type |
| `historyStore.ts:22` | `db.select<any[]>(...)` | Define and use `ClipboardHistoryRow` interface |
| `snippetStore.ts:29,51` | `db.select<any[]>(...)` | Define and use `SnippetRow` / `SnippetCategoryRow` |
| `snippetStore.ts:85` | `values: any[]` | `values: (string \| number \| boolean \| null)[]` |
| `vaultStore.ts:48,90` | `db.select<any[]>(...)` | Define and use `VaultSettingsRow` / `VaultItemRow` |
| `settingsStore.ts:40` | `store.get<any>(key)` | Type-safe getter per key |

### 3.2 Missing Type Definitions

**Needed: `src/types/database.ts`** — Database row types for all tables:
```typescript
export interface ClipboardHistoryRow {
  id: string;
  content: string;
  content_type: string;
  detected_format: string;
  source_app: string | null;
  is_pinned: number;
  is_sensitive: number;
  created_at: string;
  updated_at: string;
}

export interface SnippetRow {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  syntax: string | null;
  is_favorite: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SnippetCategoryRow {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface VaultItemRow {
  id: string;
  type: string;
  title: string;
  encrypted_data: string;
  icon: string | null;
  is_favorite: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VaultSettingsRow {
  key: string;
  value: string;
}
```

**Needed in `src/types/vault.ts`** — Missing vault data types:
```typescript
export interface PersonalData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface CompanyData {
  companyName: string;
  taxId?: string;
  registrationNumber?: string;
  website?: string;
}
```

### 3.3 Positive Findings

- **No `@ts-ignore` or `@ts-expect-error` directives** anywhere in codebase
- **TypeScript strict mode enabled** in `tsconfig.json`
- All component props have proper interfaces
- Store state interfaces are well-defined
- `DetectedFormat` union type is comprehensive

---

## 4. Competitive Analysis

### 4.1 Competitor Feature Matrix

| Feature | Raycast | Maccy | Ditto | CopyQ | Paste | 1Clipboard | **QlipLab** |
|---------|---------|-------|-------|-------|-------|------------|-------------|
| Clipboard history | Yes | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Image support | Yes | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Rich text / HTML | Yes | Yes | Yes | Yes | Yes | No | **No** |
| File clipboard | Yes | No | Yes | Yes | Yes | No | **No** |
| Search / filter | Yes | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Pin / favorite | Yes | Yes | Yes | Yes | Yes | No | **Yes** |
| Snippets / templates | Yes | No | No | Yes | No | No | **Yes** |
| Encrypted vault | No | No | No | No | No | No | **Yes** (unique) |
| Format detection (20+) | No | No | No | No | No | No | **Yes** (unique) |
| Smart transforms | No | No | No | Partial (scripting) | No | No | **Yes** (unique) |
| Diff mode | No | No | No | No | No | No | **Yes** (unique) |
| Monaco editor | No | No | No | Partial (built-in editor) | No | No | **Yes** (unique) |
| Global hotkey | Yes | Yes | Yes | Yes | Yes | Yes | **Yes** |
| Auto-paste to prev app | Yes | Yes | Yes | Yes | Yes | No | **Yes** |
| Cloud sync | No | No | Yes (network) | No | Yes (iCloud) | Yes (Google Drive) | **No** |
| Cross-device sync | No | No | Yes (LAN) | No | Yes (iCloud) | Yes | **No** |
| AI features | Yes (summarize, translate) | No | No | No | No | No | **No** |
| Custom scripting | Yes (extensions) | No | No | Yes (JS scripting) | No | No | **No** |
| Tags / labels | No | No | Yes | Yes | Yes (boards) | Yes (categories) | **No** |
| Drag & drop | Yes | No | Yes | Yes | Yes | No | **No** |
| Visual grid/timeline | No | No | No | No | Yes | No | **No** |
| Auto-cleanup rules | Yes | Yes | No | Yes | No | No | **No** (stub) |
| Export / import | No | No | Yes | Yes | No | No | **No** |
| Fuzzy search | Yes | Yes | No | No | No | No | **No** |
| Color preview | No | No | No | No | No | No | **Yes** (via transforms) |
| Regex/Hex tools | No | No | No | No | No | No | **Yes** (unique) |
| Code formatting | No | No | No | No | No | No | **Yes** (unique, Prettier) |
| Source app tracking | Yes | No | No | No | Yes | Yes | **No** |
| Multi-item paste queue | No | No | Yes | No | No | No | **No** |
| App-specific ignore rules | No | Yes | No | Yes | No | No | **No** |

### 4.2 Competitor Top 5 Differentiating Features (Detailed)

#### Raycast (macOS)

| # | Feature | Description | QlipLab Status |
|---|---------|-------------|----------------|
| 1 | **AI-powered clipboard actions** | Summarize, translate, fix grammar, change tone, custom AI actions on clipboard content using GPT-4/Claude models | **LACKS** |
| 2 | **Launcher ecosystem integration** | Clipboard history is one module within app launcher, file search, window management, calculator. Clips feed into other commands | **LACKS** |
| 3 | **Rich content type support with visual previews** | Text, images, files, links, colors with inline rich previews (link metadata, image thumbnails, color swatches) | **PARTIALLY HAS** — text + images, format detection, but no link metadata or file entries |
| 4 | **Extensions marketplace** | Hundreds of community extensions interacting with clipboard (paste into Notion, create Jira ticket, etc.) | **LACKS** |
| 5 | **Dynamic snippet placeholders** | Snippets support `{date}`, `{clipboard}`, `{cursor}`, custom variables that expand on paste | **PARTIALLY HAS** — snippets exist but no variable expansion |

#### Maccy (macOS)

| # | Feature | Description | QlipLab Status |
|---|---------|-------------|----------------|
| 1 | **Extreme lightweight design** | Native Swift, ~15-20 MB memory, NSMenu-based, launches instantly, menu bar only | **PARTIALLY HAS** — Tauri is lighter than Electron but heavier than native Swift |
| 2 | **Open source (MIT)** | Fully open source, community-driven, free (App Store version for donations) | **LACKS** |
| 3 | **Fuzzy search** | Fast fuzzy matching, partial strings, out-of-order characters | **LACKS** — QlipLab uses substring `includes()` only |
| 4 | **Paste-as-plain-text option** | One-click or shortcut to strip all formatting. Configurable default | **PARTIALLY HAS** — text paste strips formatting by default but no explicit toggle |
| 5 | **App-specific ignore rules** | Configure specific apps to exclude from monitoring (password managers, banking) | **LACKS** |

#### Ditto (Windows)

| # | Feature | Description | QlipLab Status |
|---|---------|-------------|----------------|
| 1 | **Network sync (LAN)** | Sync clipboard across LAN computers, encrypted peer-to-peer, no cloud dependency | **LACKS** |
| 2 | **Multi-item paste (queue)** | Select multiple clips, paste sequentially or all at once. FIFO queue mode for batch pasting | **LACKS** |
| 3 | **Clipboard groups/folders** | Organize clips into persistent groups with drag-and-drop, categorized permanent storage | **PARTIALLY HAS** — snippets have categories but history items cannot be grouped |
| 4 | **Rich format preservation** | Preserves all clipboard formats (RTF, HTML, images, custom). Paste same item in different formats | **PARTIALLY HAS** — text + images only, no RTF/HTML format choice |
| 5 | **Scripting and macro support** | Custom paste scripts that modify content before pasting (uppercase, prefix, regex) | **PARTIALLY HAS** — transforms are predefined, not user-scriptable |

#### CopyQ (Cross-Platform)

| # | Feature | Description | QlipLab Status |
|---|---------|-------------|----------------|
| 1 | **Full scripting engine (JS/Qt Script)** | Built-in scripting console, API for manipulating clips, automating workflows, chaining operations | **LACKS** |
| 2 | **Custom commands with triggers** | Commands triggered by global shortcuts, auto-rules (on clipboard change), or menu items. Can run shell scripts | **LACKS** |
| 3 | **Tab-based clipboard organization** | Multiple named tabs ("Work", "Code", "Links"), clips movable between tabs, per-tab history | **PARTIALLY HAS** — History/Snippets/Vault tabs but not user-created organizational tabs |
| 4 | **Built-in content editor** | Edit items directly with syntax highlighting. Modify in-place before pasting | **HAS** — Monaco editor is more powerful than CopyQ's editor |
| 5 | **Advanced automatic processing rules** | Rules on every clipboard change: auto-remove dupes, auto-tag, auto-transform, ignore patterns | **PARTIALLY HAS** — auto-detects formats and sensitive content, but rules not user-configurable |

#### Paste (macOS/iOS)

| # | Feature | Description | QlipLab Status |
|---|---------|-------------|----------------|
| 1 | **Visual pinboard / timeline UI** | Clipboard history as rich preview cards, color-coded by app, horizontal scrolling pinboard | **LACKS** |
| 2 | **iCloud sync across Apple devices** | Seamless sync Mac ↔ iPhone ↔ iPad. Copy on Mac, paste on iPhone | **LACKS** |
| 3 | **Pinboards (smart collections)** | Organize clips into boards with rules or manual curation. Auto-collect by app, content type, date | **PARTIALLY HAS** — pin/favorite but no smart collections |
| 4 | **Source app tracking** | Tags each clip with source app icon and name. Filter history by source app | **LACKS** — `sourceApp` field exists in schema but never populated |
| 5 | **Native iOS companion** | Full iOS/iPadOS app, keyboard extension for quick paste on mobile | **LACKS** |

#### 1Clipboard (Cross-Platform)

| # | Feature | Description | QlipLab Status |
|---|---------|-------------|----------------|
| 1 | **Google Drive cloud sync** | Syncs clipboard history across Windows and Mac via Google Drive. No proprietary cloud | **LACKS** |
| 2 | **True cross-platform (Windows + Mac)** | Works on both OS with synced history between them. Cross-OS clipboard sharing | **PARTIALLY HAS** — Tauri builds cross-platform but macOS-focused features (AppleScript, NSPanel) |
| 3 | **Starred clips with cloud persistence** | Star important clips for permanent sync and cross-device access | **PARTIALLY HAS** — pin/favorite without cloud persistence |
| 4 | **App categories** | Auto-group clips by source application | **LACKS** — `sourceApp` field exists but unpopulated |
| 5 | **Universal clipboard format support** | Captures text, images, HTML, files with format-aware previews | **PARTIALLY HAS** — text + images, no HTML formatting or file entries |

### 4.3 QlipLab's Unique Competitive Advantages

These features are **not found in any** of the 6 competitors analyzed:

1. **20+ format auto-detection** — No competitor detects JSON, JWT, Base64, URL, SQL, YAML, CSV, regex, hex, 7 code languages automatically
2. **Smart transforms** — Beautify JSON, decode JWT/Base64, format SQL, color conversions, YAML↔JSON, CSV→JSON, Prettier formatting — all built in
3. **Monaco editor integration** — Full code editor with syntax highlighting, significantly more powerful than any competitor's editor
4. **Diff mode** — Side-by-side/inline comparison of clipboard items with Monaco diff editor
5. **Secure vault (AES-256-GCM)** — Dedicated encrypted storage for cards, bank info, addresses, codes — goes beyond any clipboard manager
6. **Regex/hex tools** — Parse, escape, info for regex patterns; hex↔text/decimal/binary conversions

### 4.4 Features QlipLab Completely Lacks (Sorted by Impact)

| Feature | Found In | Impact for Launch |
|---------|----------|-------------------|
| **Fuzzy search** | Raycast, Maccy | **High** — feels broken without it |
| **App-specific ignore rules** | Maccy, CopyQ | **High** — security concern (password managers) |
| **Source app tracking** | Raycast, Paste, 1Clipboard | **Medium** — `sourceApp` field exists in schema, just unpopulated |
| **Rich text / HTML clipboard** | Raycast, Maccy, Ditto, CopyQ, Paste | **Medium** — every major competitor has this |
| **AI-powered actions** | Raycast | **Medium** — strong modern differentiator |
| **Cloud / network sync** | Paste, 1Clipboard, Ditto | **Medium** — most requested feature category |
| **Multi-item paste / queue** | Ditto | **Medium** — workflow accelerator |
| **User scripting / custom commands** | CopyQ, Ditto, Raycast (extensions) | **Low-Medium** — power user feature |
| **Export / Import** | Ditto, CopyQ | **Low-Medium** — useful but not critical |
| **Visual timeline / pinboard** | Paste | **Low** — design choice, not a gap |

---

## 5. Feature Proposals

### 5.1 Must-Have for v1.0

| # | Feature | What | Why | How | Effort | Files |
|---|---------|------|-----|-----|--------|-------|
| F1 | **Fix broken settings** | Wire up all 5 broken/stub settings (historyLimit, clearHistoryOnQuit, sensitiveDetectionEnabled, storeImages, autoLockMinutes) | Users see toggles that don't work — trust-breaking | Read settings in relevant hooks/stores, add Tauri window close handler | **S** (4hrs) | `historyStore.ts`, `useClipboardListener.ts`, `vaultStore.ts`, `App.tsx` |
| F2 | **Enable CSP** | Set proper Content-Security-Policy in tauri.conf.json | Critical security vulnerability — blocks store approval | Configure CSP string allowing self + error reporting URL | **S** (2hrs) | `tauri.conf.json` |
| F3 | **Enable App Sandbox** | Enable macOS app sandbox with proper entitlements | Apple will reject without sandbox | Add entitlements for accessibility, file access (app support dir), network | **M** (8hrs) | `Entitlements.plist`, may need Rust changes for sandbox-compatible paths |
| F4 | **Fix password hashing** | Add salt to vault password hashing | High security vulnerability — rainbow table attack possible | Use PBKDF2 with random salt stored alongside hash, add migration for existing hashes | **S** (4hrs) | `encryption.ts`, `vaultStore.ts` |
| F5 | **Fix large payload encryption** | Replace spread operator with chunked base64 conversion | Stack overflow on vault items > ~100KB | Chunked `String.fromCharCode` loop | **S** (1hr) | `encryption.ts` |
| F6 | **Rich text / HTML clipboard** | Capture and store HTML/RTF clipboard content alongside plain text | Every major competitor supports this — users expect formatted paste | Use `readHtml()` from clipboard plugin, store as additional field, paste as HTML when available | **M** (8hrs) | `useClipboardListener.ts`, `historyStore.ts`, `clipboard.ts`, `database.ts` |
| F7 | **Fuzzy search** | Replace substring `includes()` with fuzzy matching (fzf-like) | Maccy and Raycast have this — substring-only feels primitive | Add lightweight fuzzy scoring lib (e.g., `fzf-for-js` or custom) | **S** (4hrs) | `HistoryList.tsx`, `SnippetList.tsx` |
| F8 | **Privacy policy page** | Create privacy policy accessible from settings | Both Apple and Microsoft stores require it | Static page or in-app display | **S** (2hrs) | `SettingsDialog.tsx`, new `PrivacyPolicy.tsx` |

### 5.2 Quick Wins (< 1 day, meaningful UX improvement)

| # | Feature | What | Why | Effort | Files |
|---|---------|------|-----|--------|-------|
| Q1 | **Ignore apps list** | Setting to exclude specific apps from clipboard capture | Password managers, banking apps should be excluded | **S** | `settingsStore.ts`, `useClipboardListener.ts`, `SettingsDialog.tsx` |
| Q2 | **Paste as plain text** | Option to strip formatting on paste | Common need when pasting from web to docs | **S** | `HistoryItem.tsx`, `ItemMenu.tsx` |
| Q3 | **Clip expiration / auto-cleanup** | Auto-delete clips older than N days | Prevents unbounded database growth | **S** | `historyStore.ts`, `settingsStore.ts`, `SettingsDialog.tsx` |
| Q4 | **Delete orphaned files** | Remove all 6 orphaned source files | Reduces confusion and bundle size | **S** | Delete `TabBar.tsx`, `WelcomeScreen.tsx`, `DiffView.tsx`, `TransformView.tsx`, `MonacoDiffView.tsx`, `diff.ts`, `react.svg` |
| Q5 | **Remove debug logs** | Strip `console.log('[Clipboard]')` and similar | Cleaner production build | **S** | Multiple files |
| Q6 | **Keyboard shortcut: Cmd+N for new snippet** | Quick snippet creation hotkey | Power users expect keyboard shortcuts for common actions | **S** | `SnippetList.tsx`, `useKeyboardNavigation.ts` |
| Q7 | **Character/word count in editor** | Show stats bar in EditorView footer | Useful for writers, devs checking content length | **S** | `EditorView.tsx` or `PreviewPanel.tsx` |
| Q8 | **Double-click to view** | Double-click a clip to open in editor (single-click still pastes) | Prevents accidental paste when user wants to inspect | **S** | `HistoryItem.tsx` |

### 5.3 Differentiators (Would make QlipLab stand out)

| # | Feature | What | Why | How | Effort | Files |
|---|---------|------|-----|-----|--------|-------|
| D1 | **Smart collections / auto-categorization** | Auto-group clips by type: URLs, emails, phone numbers, colors, code, addresses | No competitor does this with 20+ format detection — QlipLab's format detector is uniquely positioned | Add filter buttons in HistoryList using existing `detectedFormat` field | **S** (4hrs) | `HistoryList.tsx`, `appStore.ts` |
| D2 | **Snippet variables / templates** | Support `{date}`, `{time}`, `{clipboard}`, `{cursor}` in snippets | CopyQ has scripting but no competitor has simple variable expansion — appeals to support agents, devs | Parse variables on paste, replace with dynamic values | **M** (8hrs) | `snippetStore.ts`, `SnippetList.tsx`, `NewSnippetDialog.tsx` |
| D3 | **Transform pipelines** | Chain multiple transforms: Base64 decode → JSON beautify → Extract field | No clipboard manager offers chained transforms — unique developer tool | Add pipeline UI in PreviewPanel, sequential transform execution | **L** (16hrs+) | `PreviewPanel.tsx`, new `PipelineView.tsx`, `transforms.ts` |
| D4 | **Color preview swatch** | Show inline color preview for detected color values in history list | Visual color preview is eye-catching and useful for designers | Render small color swatch next to color items in `HistoryItem.tsx` | **S** (2hrs) | `HistoryItem.tsx`, `FormatIcon.tsx` |
| D5 | **Markdown preview** | Detect markdown content and offer rendered preview toggle | Developers copy markdown constantly — rendered preview is valuable | Add markdown detection in `formatDetector.ts`, render with lightweight MD library | **M** (8hrs) | `formatDetector.ts`, `PreviewPanel.tsx`, new `MarkdownView.tsx` |
| D6 | **OCR from image clips** | Extract text from copied screenshots/images | Very high value for users — eliminates manual retyping | Use Tesseract.js (WASM) or native OCR API | **L** (16hrs+) | New `lib/ocr.ts`, `HistoryItem.tsx`, `ItemMenu.tsx` |
| D7 | **AI-powered features** | Summarize clip, translate, rewrite, fix grammar | Raycast is the only competitor with AI — strong differentiator | Integrate local LLM or API (OpenAI/Anthropic) with opt-in | **L** (24hrs+) | New `lib/ai.ts`, `ItemMenu.tsx`, `settingsStore.ts` |

### 5.4 v2.0 Backlog

| # | Feature | What | Effort |
|---|---------|------|--------|
| B1 | **Cloud sync** | Optional encrypted sync across devices via iCloud/Google Drive/custom server | **L** |
| B2 | **iOS/Android companion** | Mobile app for accessing clipboard history and vault | **L** |
| B3 | **Drag & drop** | Drag clips from history into any app | **M** |
| B4 | **Custom global shortcuts** | Let users configure multiple hotkeys for different actions | **M** |
| B5 | **Export / Import** | Backup and restore clipboard history, snippets, vault | **M** |
| B6 | **Tags / manual organization** | User-defined tags on clips | **M** |
| B7 | **Auto-commands** | Trigger actions when specific content is copied (like CopyQ) | **L** |
| B8 | **Keyboard-driven workflow (vim-like)** | Vim/VS Code keybindings for power users | **M** |
| B9 | **Format conversion** | JSON↔YAML, CSV↔JSON, XML↔JSON bidirectional in editor | **M** |
| B10 | **Hash generation** | MD5, SHA-256 from clipboard content | **S** |
| B11 | **Text manipulation** | Sort lines, deduplicate, trim, wrap/unwrap | **S** |

### 5.5 Feature Ideas Analysis (from prompt)

| Feature Idea | Assessment | Priority |
|-------------|-----------|----------|
| Fuzzy search | **Must-have** — competitor standard | v1.0 (F7) |
| Pinned/favorite clips | **Already implemented** | Done |
| Smart collections / auto-categorization | **Differentiator** — leverages existing format detection | v1.0 (D1) |
| Snippet variables (`{date}`, `{cursor}`) | **Differentiator** — unique in clipboard managers | v1.0 (D2) |
| Global hotkey for quick paste | **Already implemented** | Done |
| Clipboard sync across devices | **v2.0** — complex, needs encryption infra | Backlog (B1) |
| Image clipboard support | **Already implemented** | Done |
| Color picker detection and preview | **Quick win** — partial (detection exists, preview missing) | v1.0 (D4) |
| Drag & drop from history | **v2.0** — requires native DnD integration | Backlog (B3) |
| Vim-like keybindings | **v2.0** — niche audience | Backlog (B8) |
| Export/Import | **v2.0** — useful but not launch-critical | Backlog (B5) |
| Clip expiration / auto-cleanup | **Quick win** — simple to implement | v1.0 (Q3) |
| OCR from image clips | **Differentiator** — high value, high effort | v1.5 (D6) |
| AI features (summarize, translate) | **Differentiator** — only Raycast has this | v1.5 (D7) |
| Tags and manual organization | **v2.0** — nice-to-have | Backlog (B6) |

---

## 6. Implementation Plan

### Priority Order (by Impact × Urgency for launch)

| # | Item | Effort | Impact (1-5) | Priority | Category | Status |
|---|------|--------|-------------|----------|----------|--------|
| 1 | Fix CSP (C1) | S | 5 | **P0** | Security | DONE |
| 2 | Fix App Sandbox (C2) | M | 5 | **P0** | Store Blocker | DONE |
| 3 | Fix broken settings (5 items) | S | 4 | **P0** | Bug Fix | DONE |
| 4 | Fix password hashing (H1) | S | 5 | **P0** | Security | DONE |
| 5 | Fix spread operator overflow (H5) | S | 4 | **P0** | Bug Fix | DONE |
| 6 | Delete orphaned code | S | 2 | **P1** | Cleanup | DONE |
| 7 | Remove debug logs | S | 2 | **P1** | Cleanup | DONE |
| 8 | Add privacy policy | S | 5 | **P1** | Store Requirement | DONE |
| 9 | Add database row types | S | 3 | **P1** | Type Safety | DONE |
| 10 | Fix vault.ts `any` types | S | 3 | **P1** | Type Safety | DONE |
| 11 | Fuzzy search | S | 4 | **P1** | UX | DONE |
| 12 | Smart collections (filter by format) | S | 4 | **P1** | Differentiator | DONE |
| 13 | Color preview swatch | S | 3 | **P2** | Differentiator | DONE |
| 14 | Ignore apps list | S | 3 | **P2** | UX | DONE |
| 15 | Clip expiration | S | 3 | **P2** | UX | DONE |
| 16 | Character/word count | S | 2 | **P2** | UX | DONE |
| 17 | Rich text/HTML clipboard | M | 4 | **P2** | Feature Gap | DONE |
| 18 | Snippet variables | M | 4 | **P2** | Differentiator | DONE |
| 19 | Markdown preview | M | 3 | **P3** | Differentiator | DONE |
| 20 | Vault brute-force protection | S | 3 | **P3** | Security | DONE |
| 21 | Transform pipelines | L | 3 | **P3** | Differentiator | DONE |
| 22 | OCR from images | L | 4 | **P3** | Differentiator | DONE |
| 23 | AI features | L | 4 | **P3** | Differentiator | DONE |

---

## 7. Store Publishing Blockers

### 7.1 Apple App Store — Must Fix

| # | Blocker | Details | Effort |
|---|---------|---------|--------|
| 1 | **App Sandbox must be enabled** | `Entitlements.plist` has `com.apple.security.app-sandbox` = `false`. Apple requires sandbox for Mac App Store. Need entitlements for: `com.apple.security.automation.apple-events` (paste), `com.apple.security.network.client` (error reporting), `com.apple.security.files.user-selected.read-write` (if needed) | M |
| 2 | **Privacy policy required** | Apple requires privacy policy URL in App Store listing. Must disclose: clipboard access, local data storage, optional crash reporting | S |
| 3 | **App Privacy nutrition labels** | Must declare: clipboard data accessed, crash data collected (optional), no data shared with third parties | S |
| 4 | **Notarization setup** | Ensure `codesign` and `notarytool` are configured. Tauri handles this but needs Apple Developer account + certificates | M |
| 5 | **1024x1024 app icon** | Current icons include standard sizes but verify 1024x1024 exists for App Store listing | S |
| 6 | **Info.plist usage descriptions** | May need `NSAppleEventsUsageDescription` for AppleScript automation (paste simulation) | S |
| 7 | **Guideline 4.0 - Privacy** | Clipboard access is sensitive on iOS/macOS. Must justify continuous clipboard monitoring. Consider: only capture when app is frontmost or when user triggers, OR clearly explain monitoring in first-run dialog | S |
| 8 | **Guideline 2.1 - Completeness** | 5 broken settings (19-23 in feature audit) must either work or be removed before submission | S |

### 7.2 Microsoft Store — Must Fix

| # | Blocker | Details | Effort |
|---|---------|---------|--------|
| 1 | **MSIX packaging** | Tauri v2 supports MSIX via WiX. Verify `tauri.conf.json` bundle config generates proper MSIX | S |
| 2 | **Privacy policy** | Same as Apple — required for Microsoft Store | S |
| 3 | **Content rating** | Complete IARC content rating questionnaire (standard for all apps) | S |
| 4 | **Windows icon sizes** | Current icons include Square sizes. Verify all required: 44x44, 50x50, 71x71, 150x150, 310x310 — check `src-tauri/icons/` | S |
| 5 | **Windows paste simulation** | Verify `enigo` crate works correctly on Windows. Current code uses `Ctrl+V` simulation — test with different apps | M |
| 6 | **Non-macOS panel fallback** | `show_panel`/`hide_panel` commands are no-ops on Windows. Verify window management works correctly without NSPanel | M |

### 7.3 Cross-Platform Checklist

- [ ] Version `0.1.0` consistent across `package.json`, `Cargo.toml`, `tauri.conf.json`, `config.ts` — **Currently consistent**
- [ ] App identifier `com.qliplab.app` consistent — **OK**
- [ ] macOS panel features degrade gracefully on Windows/Linux — **Needs verification**
- [ ] Crash reporting works — **Implemented with rate limiting**
- [ ] License file included — **Not found in root** — needs `LICENSE` file
- [ ] CHANGELOG prepared — **Not found** — needs `CHANGELOG.md`

---

## 8. Store Publishing Warnings

### Should fix but won't cause rejection

| # | Warning | Details |
|---|---------|---------|
| 1 | **CSP disabled** | While not a store rejection reason, it's a security best practice. Should enable before launch. |
| 2 | **`prettier` in production deps** | Adds ~3.8MB to bundle. Move to devDependencies and lazy-load only the needed parts, or accept the size. |
| 3 | **Debug console.log statements** | Not a rejection reason but unprofessional. Strip before release. |
| 4 | **Orphaned code** | Adds dead weight to bundle. Clean up before release. |
| 5 | **No app description** | `tauri.conf.json` has `"description": ""` (empty via Cargo.toml which says "Cross-platform clipboard manager"). Add proper description. |
| 6 | **Autostart auto-enables** | `useAutostart.ts` automatically enables launch-on-login without asking. Some users find this annoying. Consider making it opt-in via settings. |
| 7 | **No localization** | App is English-only. Microsoft Store has global audience. Consider i18n for v1.1. |
| 8 | **Window title is lowercase** | `"title": "qliplab"` — consider capitalizing to "QlipLab" for store listing. |
| 9 | **No about/version dialog** | Users can't see current version within the app. |

---

## 9. UX/UI & Architecture Improvements

### 9.1 UX/UI Issues

| # | Issue | Location | Recommendation |
|---|-------|----------|---------------|
| 1 | **No feedback on copy action** | `HistoryItem.tsx` | Flash animation exists but is subtle. Add toast notification or checkmark icon. |
| 2 | **Search is substring-only** | `HistoryList.tsx:21` | Implement fuzzy search — users expect this (Raycast, Maccy both have it) |
| 3 | **No empty state for vault categories** | `NewVaultItemDialog.tsx` | Category creation exists in store but not in UI — confusing |
| 4 | **HintBar shows ⌥D on all platforms** | `HintBar.tsx:85` | Should show `Alt+D` on Windows/Linux. Use `platform.ts` `getAltKey()` |
| 5 | **No confirmation before "Clear All"** | `historyStore.ts:88` | Destructive action with no confirmation dialog |
| 6 | **Accessibility: no ARIA labels** | All components | Screen reader support is minimal. Add `aria-label`, `role`, `aria-selected` to list items |
| 7 | **No keyboard shortcut to focus search** | `DragBar.tsx` | Add `Cmd+F` or `/` to focus search field |
| 8 | **Window resizing loses preview state** | `PreviewPanel.tsx` | When preview opens, window expands to 1300x700. If user manually resizes, shrinking doesn't restore user's size |

### 9.2 Architecture Improvements

| # | Area | Issue | Recommendation |
|---|------|-------|---------------|
| 1 | **State management** | Settings are read by some consumers but ignored by others | Create a settings-aware clipboard listener that reads all relevant settings |
| 2 | **Store coupling** | `useDiffMode` hook directly accesses multiple stores | Consider a composite hook or event system for cross-store communication |
| 3 | **Database queries** | `loadItems()` reloads entire table after each add/delete | Add optimistic updates — update local state first, then persist |
| 4 | **Monaco bundle size** | Monaco editor is ~2.5MB. Lazy-loaded (good) but adds to initial download | Consider code-splitting Monaco into a separate chunk with on-demand loading |
| 5 | **Image storage** | Full base64 images stored in SQLite TEXT column | Consider storing images as files in app data dir with path reference in DB |
| 6 | **Error handling** | All store actions swallow errors with `console.error` | Add user-facing error feedback for critical operations (vault unlock, db init) |
| 7 | **Window management** | `window.ts` has 6 functions with duplicate centering logic | Extract `centerWindow(width, height)` helper |
| 8 | **Duplicate image parsing** | `ImageView.tsx` and `imageUtils.ts` both parse image data independently | `ImageView.tsx` should use `parseImageData()` from `imageUtils.ts` |

### 9.3 Performance Considerations

| # | Issue | Impact | Recommendation |
|---|-------|--------|---------------|
| 1 | **No virtualization for long lists** | Rendering 100+ items causes jank | Add virtual scrolling (e.g., `@tanstack/react-virtual`) for history list |
| 2 | **Full re-render on search** | Every keystroke re-filters and re-renders entire list | Debounce search input (200ms) and memoize filtered results |
| 3 | **Image thumbnail generation** | Full-size base64 rendered as 20x60px thumbnails | Generate and cache actual thumbnails |
| 4 | **Prettier lazy-load** | First code format operation has 500ms+ load delay | Pre-load Prettier when user opens preview panel |
| 5 | **SQLite query on every clipboard change** | `addItem` checks duplicates by loading all items into JS | Add SQL-level duplicate check: `SELECT id FROM clipboard_history WHERE content = ? LIMIT 1` |

---

## Appendix A: Current View & Transform Screen Analysis

### View Screen (Current)
- **Location**: `PreviewPanel.tsx` → `EditorView.tsx`
- **Behavior**: Opens Monaco editor with full syntax highlighting based on `detectedFormat`
- **Capabilities**: Fully editable, line numbers, word wrap, folding, language auto-detection
- **Actions**: Copy edited content, Paste edited content (auto-hide + paste to prev app)
- **Missing**: No "Save as new clip", no "Update original", no Find & Replace, no stats bar

### Transform Screen (Current)
- **Location**: `PreviewPanel.tsx` → `EditorView.tsx` (same component, different mode)
- **Behavior**: Shows transform result (e.g., beautified JSON) in Monaco editor
- **Capabilities**: Editable (user can modify transform output), same Monaco features as View
- **Missing**: No pipeline transforms, no custom scripts, no template system, no live preview during configuration

### Recommendations for View & Transform Enhancement

1. **Add stats bar** to `EditorView.tsx`: Line count, word count, character count, file size estimation
2. **Add "Save as new clip" button** in PreviewPanel footer — creates new history item from edited content
3. **Add Find & Replace** — Monaco has built-in F&R, just need to not suppress Cmd+F
4. **Add "Copy as..." menu** — Copy as HTML, copy as plain text, copy as markdown
5. **Pipeline transforms** — New `PipelineView.tsx` component allowing chained operations
6. **Format conversion** — Direct JSON↔YAML, CSV↔JSON conversion buttons in editor toolbar

---

## Appendix B: File Inventory

### Files to DELETE (orphaned)
```
src/components/layout/TabBar.tsx
src/components/welcome/WelcomeScreen.tsx
src/components/preview/DiffView.tsx
src/components/preview/TransformView.tsx
src/components/preview/MonacoDiffView.tsx
src/lib/diff.ts
src/assets/react.svg
```

### Files to CREATE
```
src/types/database.ts          — Database row type definitions
docs/PRIVACY.md                — Privacy policy
LICENSE                        — License file
CHANGELOG.md                   — Release changelog
```

### Files to MODIFY (priority order)
```
tauri.conf.json                — Enable CSP
src-tauri/Entitlements.plist   — Enable app sandbox
src/lib/encryption.ts          — Fix password hashing, fix spread operator
src/stores/historyStore.ts     — Use historyLimit setting, add db row types
src/hooks/useClipboardListener.ts — Read sensitiveDetectionEnabled, storeImages settings
src/stores/vaultStore.ts       — Use autoLockMinutes setting, add db row types
src/types/vault.ts             — Add PersonalData, CompanyData, fix `any`
src/stores/snippetStore.ts     — Add db row types
src/stores/settingsStore.ts    — Type-safe store.get()
```
