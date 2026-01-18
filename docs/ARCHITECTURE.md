# qliplab Architecture

## Overview

qliplab is a cross-platform clipboard manager built with **Tauri v2** (Rust backend) and **React 19** (TypeScript frontend). It provides clipboard history management, code snippets storage, and a secure vault for sensitive data.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Tauri | v2.x |
| Frontend | React | 19.x |
| Language | TypeScript | 5.6+ |
| Build Tool | Vite | 6+ |
| Styling | Tailwind CSS | 4.x |
| State Management | Zustand | 5+ |
| Animations | Framer Motion | 12+ |
| Database | SQLite | via tauri-plugin-sql |
| Storage | Key-Value Store | via tauri-plugin-store |

## Project Structure

```
qliplab/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── feedback/             # Issue reporting components
│   │   ├── history/              # Clipboard history components
│   │   ├── layout/               # Layout components (DragBar, TabBar, etc.)
│   │   ├── preview/              # Transform & Diff preview
│   │   ├── settings/             # Settings dialog
│   │   ├── snippets/             # Snippets management
│   │   ├── ui/                   # Shared UI components
│   │   ├── vault/                # Secure vault components
│   │   └── welcome/              # Welcome screen
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   ├── stores/                   # Zustand state stores
│   ├── types/                    # TypeScript type definitions
│   ├── App.tsx                   # Main application component
│   └── main.tsx                  # Application entry point
├── src-tauri/                    # Tauri/Rust backend
│   ├── src/
│   │   ├── lib.rs                # Main Tauri plugin & commands
│   │   └── main.rs               # Entry point
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── docs/                         # Documentation
└── package.json                  # Node dependencies
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         qliplab App                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Frontend                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │  │ History  │  │ Snippets │  │  Vault   │              │    │
│  │  │   Tab    │  │   Tab    │  │   Tab    │              │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘              │    │
│  │       │              │              │                    │    │
│  │  ┌────▼──────────────▼──────────────▼────┐              │    │
│  │  │           Zustand Stores              │              │    │
│  │  │  (appStore, historyStore, vaultStore) │              │    │
│  │  └───────────────────┬───────────────────┘              │    │
│  └──────────────────────┼───────────────────────────────────┘    │
│                         │                                         │
│  ┌──────────────────────▼───────────────────────────────────┐    │
│  │                    Tauri IPC Bridge                       │    │
│  │   invoke('simulate_paste'), invoke('save_frontmost_app') │    │
│  └──────────────────────┬───────────────────────────────────┘    │
│                         │                                         │
│  ┌──────────────────────▼───────────────────────────────────┐    │
│  │                    Rust Backend                           │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │    │
│  │  │  Clipboard  │  │    SQL      │  │   Global    │       │    │
│  │  │   Plugin    │  │   Plugin    │  │  Shortcut   │       │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │       SQLite Database          │
              │  ┌─────────────────────────┐  │
              │  │   clipboard_history     │  │
              │  │   snippets              │  │
              │  │   snippet_categories    │  │
              │  │   vault_items           │  │
              │  │   vault_settings        │  │
              │  └─────────────────────────┘  │
              └───────────────────────────────┘
```

## Tauri Plugins Used

| Plugin | Purpose |
|--------|---------|
| `tauri-plugin-clipboard-manager` | Read/write system clipboard |
| `tauri-plugin-sql` | SQLite database access |
| `tauri-plugin-global-shortcut` | Register Cmd+Shift+V global shortcut |
| `tauri-plugin-store` | Key-value storage for settings |
| `tauri-plugin-autostart` | Launch app on system startup |
| `tauri-plugin-opener` | Open external URLs |

## Data Flow

### Clipboard Monitoring
```
System Clipboard → useClipboardListener (polling 500ms)
                 → detectFormat() → isSensitive()
                 → historyStore.addItem()
                 → SQLite (clipboard_history table)
```

### Paste Operation (Ditto-like behavior)
```
User clicks item → writeText() to clipboard
                 → hideWindow()
                 → invoke('simulate_paste')
                 → Rust: activate previous app
                 → Rust: AppleScript keystroke "v" using command down
```

### Vault Encryption
```
User data → JSON.stringify()
          → encrypt() with AES-256-GCM
          → PBKDF2 key derivation (100,000 iterations)
          → SQLite (encrypted_data column)
```

## Window Management

- **Default Size**: 420x450 pixels
- **Preview Panel Size**: 840x450 pixels (expands for transform/diff)
- **Window Behavior**: Hides instead of closing, toggled via global shortcut

## Security Considerations

1. **Vault Encryption**: AES-256-GCM with PBKDF2 key derivation
2. **Master Password**: SHA-256 hashed, never stored in plaintext
3. **Session Password**: Kept in memory only, cleared on lock/quit
4. **Sensitive Detection**: Auto-detects passwords, API keys, IBANs, credit cards
5. **Vault Search**: Only searches titles, not encrypted content

## Error Handling

- **ErrorBoundary**: Wraps entire app, reports errors to GitHub Issues
- **Auto Error Reporting**: Opt-in crash reporting via Val.town proxy
- **Rate Limiting**: Max 10 issues/hour, 50 issues/day
- **Duplicate Prevention**: Same error not reported within 1 minute

## Build & Development

```bash
# Development
npm run tauri dev

# Production build
npm run tauri build
```

## Related Documentation

- [Domain Model](./DOMAIN.md) - Business concepts and types
- [Features](./FEATURES.md) - Feature specifications
- [Components](./COMPONENTS.md) - UI component reference
- [Stores](./STORES.md) - State management details
- [Tauri Backend](./TAURI.md) - Rust/Tauri implementation
