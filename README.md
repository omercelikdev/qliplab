# qliplab

The smart clipboard manager for everyone.

## Features

- **Clipboard History** - Never lose a copy again
- **Auto-Detect** - Automatic format detection (JSON, JWT, Base64, URL, SQL...)
- **Transforms** - Beautify, decode, encode with one click
- **Diff** - Compare two clips side-by-side
- **Snippets** - Save and organize code snippets
- **Secure Vault** - Store sensitive info with AES-256 encryption

## Installation

### macOS
Download `qliplab_x.x.x_universal.dmg` from releases.

### Windows
Download `qliplab_x.x.x_x64-setup.exe` from releases.

### Linux
Download `qliplab_x.x.x_amd64.AppImage` from releases.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+V` | Toggle qliplab |
| `Option/Alt+D` | Enter diff mode |
| Click item | Copy & paste |
| Hover + menu | Transform options |

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run tauri dev
```

## Build

```bash
# Build for current platform
npm run tauri build

# Platform-specific builds
npm run tauri:build:mac    # macOS universal
npm run tauri:build:win    # Windows x64
npm run tauri:build:linux  # Linux x64
```

## Build Outputs

- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/appimage/`

## Tech Stack

- [Tauri v2](https://tauri.app/) - Rust + Web framework
- [React 19](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS 4](https://tailwindcss.com/) - Styling
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Framer Motion](https://www.framer.com/motion/) - Animations

## License

MIT
