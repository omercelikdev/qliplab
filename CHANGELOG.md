# Changelog

All notable changes to qliplab will be documented in this file.

## [0.1.0] - 2026-02-22

### Features
- **Clipboard History** — Auto-capture text and images with format detection
- **Smart Format Detection** — JSON, JWT, Base64, URL, SQL, UUID, timestamp, color, code (JS/TS/Python/Go/Rust/Java/C#), YAML, CSV, XML, HTML, Markdown, Regex, Hex
- **Transform Pipeline** — 44 chainable transforms across Encode, Decode, Format, Convert, Hash, Case, and Text categories
- **Diff Mode** — Compare two clipboard items side-by-side (Option+D)
- **Snippets** — Reusable text blocks with categories, syntax highlighting, and variable expansion (`{date}`, `{time}`, `{clipboard}`, `{uuid}`)
- **Snippet Auto-Expand** — Type trigger text anywhere to auto-paste snippet content
- **Secure Vault** — AES-256-GCM encrypted storage with PBKDF2, brute-force protection (exponential backoff)
- **Ditto-like Paste** — Select an item and paste directly to the previous app
- **Paste Queue** — Select multiple items and paste all sequentially
- **Edit Before Paste** — Preview and edit content before pasting
- **Rich Text Support** — HTML clipboard with rendered preview and plain text fallback
- **Markdown Detection** — Auto-detect and render markdown content
- **OCR** — Extract text from clipboard images (macOS Vision framework)
- **AI Actions** — Summarize, fix grammar, translate, explain code, adjust tone (Anthropic/OpenAI)
- **Tags** — Label, filter, and organize clipboard items with colored tags
- **Auto-Commands** — Automatically transform clipboard content by detected format
- **Export/Import** — Backup and restore history, snippets, and vault data
- **Drag & Drop** — Drag text items from history to external applications
- **Custom Global Shortcut** — Configure toggle shortcut from settings
- **Vim-like Navigation** — j/k navigate, gg/G jump, dd delete, / search
- **Format Filter Bars** — Quick filter by format in history, snippets, and vault
- **Pinned Items** — Pin important items across all tabs
- **Sensitive Data Detection** — Auto-detect passwords and API keys
- **Ignored Apps** — Exclude specific apps from clipboard monitoring
- **Clip Expiration** — Auto-delete old clips after configurable period
- **Source App Tracking** — See which app each clipboard item came from
- **Color Preview** — Visual swatch for detected color values
- **Theme Support** — Light, dark, and system theme modes
- **Auto-start** — Launch on login option
- **Issue Reporting** — Manual reports and opt-in auto error reporting
- **Privacy Policy** — Built-in privacy policy dialog

### Security
- AES-256-GCM encryption with PBKDF2 (100k iterations) for vault
- Salted SHA-256 password hashing
- CSP headers enabled
- App Sandbox enabled (macOS)
- SQL injection prevention with parameterized queries
- AppleScript injection sanitization
- Vault brute-force protection with exponential backoff
- No clipboard/vault content in error reports

### Technical
- Tauri v2 (Rust) + React 19 + TypeScript 5.8
- SQLite database with indexed queries
- Zustand state management
- Tailwind CSS 4 styling
- macOS NSPanel for Spotlight-like behavior
- CGEvent for system-level paste simulation
