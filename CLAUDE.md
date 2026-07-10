# qliplab - AI Development Context

## Project Summary
Cross-platform clipboard manager. Tauri v2 + React 19 + TypeScript.

**For detailed documentation, see:**
- [Architecture](docs/ARCHITECTURE.md) - System design, tech stack, data flow
- [Domain Model](docs/DOMAIN.md) - Types, database schema, user flows
- [Features](docs/FEATURES.md) - Feature specifications and implementation
- [Components](docs/COMPONENTS.md) - UI component reference
- [Stores](docs/STORES.md) - Zustand state management
- [Tauri Backend](docs/TAURI.md) - Rust/Tauri implementation
- [Security](docs/SECURITY.md) - Encryption, audit, App Store compliance
- [Reporting](docs/REPORTING.md) - Issue reporting system (bug/feedback → GitHub Issues)
- [Publishing](docs/PUBLISHING.md) - App Store submission guide
- [Development](docs/DEVELOPMENT.md) - Dev commands & workflow

---

## Quick Reference

### Core Features
1. **Clipboard History** - Auto-captures copied content, search, pin
2. **Format Auto-Detection** - JSON, JWT, Base64, URL, SQL, UUID, timestamp
3. **Smart Transforms** - Beautify, decode, encode based on format
4. **Diff Mode** - Compare two items side-by-side (Option+D)
5. **Snippets** - Save reusable code/text blocks
6. **Secure Vault** - AES-256-GCM encrypted storage for sensitive data
7. **Ditto-like Paste** - Pastes to previous app automatically
8. **Issue Reporting** - Manual reports + opt-in crash reporting

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Tauri v2 (Rust + Web) |
| Frontend | React 19 + TypeScript 5.6+ |
| Build | Vite 6+ |
| Styling | Tailwind CSS 4 |
| State | Zustand 5+ |
| Animations | Framer Motion 12+ |
| Database | SQLite (tauri-plugin-sql) |

### Commands
```bash
npm run tauri dev    # Development
npm run tauri build  # Production build
```

---

## Project Structure

```
qliplab/
├── src/
│   ├── components/
│   │   ├── feedback/         # ReportIssueDialog, ErrorReportingOptIn
│   │   ├── history/          # HistoryList, HistoryItem, ItemMenu, FormatIcon
│   │   ├── layout/           # DragBar, SearchBar, TabBar, HintBar
│   │   ├── preview/          # PreviewPanel, TransformView, DiffView
│   │   ├── settings/         # SettingsDialog
│   │   ├── snippets/         # SnippetList, SnippetItem, NewSnippetDialog
│   │   ├── ui/               # ScrollArea (shadcn)
│   │   ├── vault/            # VaultList, VaultItem, VaultLock, NewVaultItemDialog
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useClipboardListener.ts  # Polls clipboard, adds to history
│   │   ├── useDiffMode.ts           # Option+D toggle, selection management
│   │   ├── useGlobalShortcut.ts     # global shortcut registration (default Alt+Q)
│   │   ├── useKeyboardNavigation.ts # Arrow keys + Enter navigation
│   │   ├── useAutostart.ts          # Launch on login
│   │   └── useTheme.ts              # Theme application
│   ├── lib/
│   │   ├── database.ts       # SQLite init, tables
│   │   ├── encryption.ts     # AES-256-GCM, PBKDF2
│   │   ├── formatDetector.ts # detectFormat(), isSensitive()
│   │   ├── transforms.ts     # JSON, Base64, JWT, SQL transforms
│   │   ├── diff.ts           # computeDiff()
│   │   ├── window.ts         # hideAndPaste, toggleWindow
│   │   ├── errorReporter.ts  # Auto error reporting
│   │   ├── systemInfo.ts     # System info for reports
│   │   └── config.ts         # Worker API URL, app version
│   ├── stores/
│   │   ├── appStore.ts       # UI state, tabs, diff mode, search
│   │   ├── historyStore.ts   # Clipboard history
│   │   ├── snippetStore.ts   # Snippets management
│   │   ├── vaultStore.ts     # Encrypted vault
│   │   ├── previewStore.ts   # Transform/diff panel
│   │   ├── settingsStore.ts  # App settings
│   │   └── feedbackStore.ts  # Issue reporting
│   ├── types/
│   │   ├── clipboard.ts      # ClipboardItem, DetectedFormat
│   │   ├── snippet.ts        # Snippet, SnippetCategory
│   │   └── vault.ts          # VaultItem, CardData, BankData, etc.
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/
│   ├── src/lib.rs            # Tauri commands, plugin init
│   └── tauri.conf.json
└── docs/                     # Detailed documentation
```

---

## Stores Quick Reference

| Store | Key State | Key Actions |
|-------|-----------|-------------|
| `appStore` | activeTab, searchQuery, isDiffMode, diffSelectedIds | setActiveTab, setSearchQuery, addToDiffSelection |
| `historyStore` | items, isLoading | loadItems, addItem, deleteItem, togglePin |
| `snippetStore` | snippets, categories | loadSnippets, createSnippet, deleteSnippet |
| `vaultStore` | isLocked, items | unlock, lock, createItem, deleteItem |
| `previewStore` | isOpen, mode, transformedContent | openTransform, openDiff, close |
| `settingsStore` | settings | loadSettings, updateSetting |
| `feedbackStore` | autoErrorReporting, isSubmitting | submitIssue, setAutoErrorReporting |

---

## Key Implementations

### Clipboard Monitoring
```typescript
// useClipboardListener.ts - event-driven via tauri-plugin-clipboard (not polling)
const unlistenText = await onTextUpdate(async (text) => {
  await addItem({ content: text, detectedFormat: detectFormat(text), ... });
});
const unlistenImage = await onImageUpdate(async (base64Image) => { ... });
// Limits: MAX_CONTENT_SIZE 5MB (text/image), MAX_HTML_SIZE 1MB
```

### Ditto-like Paste Flow
```typescript
// 1. Show window - saves previous app
await invoke('save_frontmost_app');
await window.show();

// 2. User clicks item
await writeText(item.content);

// 3. Hide and paste
await window.hide();
await invoke('simulate_paste'); // Activates prev app + Cmd+V
```

### Vault Encryption
```typescript
// encrypt() - AES-256-GCM + PBKDF2 (210,000 iterations; legacy 100k auto-migrated on unlock)
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await deriveKey(password, salt);
const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
```

### Tauri Commands (Rust)
```rust
// macOS uses direct Cocoa/CGEvent APIs (no AppleScript/osascript — avoids apple-events entitlements).
// Windows/Linux use SetForegroundWindow/enigo. ~18 commands total in src-tauri/src/lib.rs.
#[tauri::command]
fn save_frontmost_app() -> Result<(), String>  // NSWorkspace: record the app to return focus to
fn simulate_paste() -> Result<(), String>       // CGEvent: activate prev app + synthesize Cmd/Ctrl+V
```

---

## Database Schema

```sql
-- clipboard_history: id, content, content_type, detected_format, is_pinned, is_sensitive, created_at
-- snippets: id, title, content, category_id, syntax, is_favorite, sort_order
-- vault_items: id, type, title, encrypted_data, is_favorite, sort_order
-- vault_settings: key, value (stores master_password_hash)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Alt+Q | Toggle window (default; user-configurable in Settings) |
| Cmd/Ctrl+1…9 | Paste the Nth clip (works while typing in search) |
| Option+D (macOS) / Alt+D | Toggle diff mode |
| Escape | Exit diff / Close preview |
| ↑/↓ | Navigate list |
| Enter | Select & paste |

---

## Error Reporting

### Manual Reporting
- Settings → "Report Issue / Send Feedback"
- Creates GitHub issue via the Cloudflare Worker proxy (`qliplab-api.omercelikdev.workers.dev`)

### Auto Error Reporting (Opt-in)
- ErrorBoundary catches React errors
- Global handlers catch unhandled exceptions
- Rate limited: 10/hour, 50/day
- No clipboard/vault content sent

**Config**: `src/lib/config.ts`
```typescript
export const CONFIG = {
  ISSUE_REPORTER_URL: 'https://qliplab-api.omercelikdev.workers.dev/report',
  APP_TOKEN: '...', // soft anti-abuse gate for the Worker
  APP_VERSION: '0.1.x',
};
```

---

## Development Rules (MANDATORY)

### 1. Tests Required for Every Change
- **Every new function** in `src/lib/` MUST have unit tests
- **Every bug fix** MUST include a regression test proving the fix
- Run `npx vitest run` before committing — all tests must pass
- Target: 95%+ line coverage, 100% function coverage
- Test files: `src/lib/{module}.test.ts` using vitest

### 2. i18n Required for Every UI String
- **Every user-visible string** MUST use `t('key')` from `useTranslation()`
- **Never hardcode** UI text in components — always add to `en.json` first
- After adding keys to `en.json`, add translations to ALL 15 locale files:
  `en, tr, ar, de, fr, es, pt, zh, ja, ko, ru, it, hi, nl, pl`
- Key convention: `{namespace}.{section}.{key}` (e.g. `history.emptyState.title`)
- Use `{{variable}}` for interpolation
- DO NOT translate: brand names, format names (JSON, YAML), programming terms

### 3. RTL Awareness
- Use logical CSS properties: `ps-`/`pe-` (not `pl-`/`pr-`), `ms-`/`me-` (not `ml-`/`mr-`)
- Use `text-start`/`text-end` (not `text-left`/`text-right`)
- Use `border-s`/`border-e` (not `border-l`/`border-r`)
- Toggle switches: `ltr:left-*/rtl:right-*` variants

### 4. Cross-Platform (CRITICAL)
- **Every change MUST work on macOS, Windows, AND Linux**
- Rust: use `#[cfg(target_os = "macos")]` / `#[cfg(not(target_os = "macos"))]` for platform-specific code
- Rust: `show_panel`/`hide_panel` already have cross-platform implementations — always use them
- Tray icon: macOS = template image (black on transparent), Windows/Linux = full-color icon
- Window management: macOS uses NSPanel, Windows/Linux use standard Tauri window — both handled by `show_panel`/`hide_panel`
- Keyboard shortcuts: macOS = `Cmd`, Windows/Linux = `Ctrl` — use platform-aware mappings
- Never add macOS-only features without a Windows/Linux fallback
- Test `cargo check` for Rust and `npx tsc --noEmit` for TypeScript

### 5. Code Quality Gates (Run Before Every Commit)
- `npx tsc --noEmit` — zero TypeScript errors
- `npx vitest run` — all tests pass
- No `any` types in `src/` (except test files with `as any`)
- No `console.log` in production code (only `console.error` in catch blocks)
- No unauthorized functional changes without user approval

---

## Common Patterns

### Component with Store
```typescript
function MyComponent() {
  const items = useHistoryStore((state) => state.items); // Selective subscription
  const { addItem } = useHistoryStore(); // Destructure actions
}
```

### Tauri Invoke
```typescript
import { invoke } from '@tauri-apps/api/core';
await invoke('command_name', { arg1: 'value' });
```

### Window Management
```typescript
import { getCurrentWindow } from '@tauri-apps/api/window';
const window = getCurrentWindow();
await window.show(); / await window.hide();
```
