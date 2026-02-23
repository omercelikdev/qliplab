# PHASE 8: Cross-Platform Build

> **First read:** `prompts/COMMON.md` for Master Instructions
> **Prerequisites:** PHASE 1-7 completed

---

## PROMPT

```
Continuing qliplab. This is PHASE 8 - Cross-platform build and final preparations.

## READ FIRST
- CLAUDE.md
- docs/PROGRESS.md

## STEP 1: Tauri Build Config

Update **src-tauri/tauri.conf.json**:
```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.qliplab.app",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "minimumSystemVersion": "10.13"
    },
    "windows": {
      "wix": { "language": ["en-US"] }
    },
    "linux": {
      "appimage": { "bundleMediaFramework": true }
    }
  }
}
```

## STEP 2: Platform Utils

**src/lib/platform.ts:**
```typescript
export function getModifierKey(): string {
  return navigator.platform.toUpperCase().includes('MAC') ? '⌘' : 'Ctrl';
}

export function getShortcutDisplay(shortcut: string): string {
  const mod = getModifierKey();
  return shortcut.replace('CommandOrControl', mod).replace('Shift', '⇧').replace('+', '');
}
```

## STEP 3: Build Scripts

Update **package.json**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:mac": "tauri build --target universal-apple-darwin",
    "tauri:build:win": "tauri build --target x86_64-pc-windows-msvc",
    "tauri:build:linux": "tauri build --target x86_64-unknown-linux-gnu"
  }
}
```

## STEP 4: README.md

Create **README.md** in project root:
```markdown
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
| `Cmd/Ctrl+T` + Click | Transform |
| `Cmd/Ctrl+D` + Click×2 | Diff |

## Development

\`\`\`bash
npm install
npm run tauri dev
\`\`\`

## Build

\`\`\`bash
npm run tauri build
\`\`\`

## License

MIT
```

## STEP 5: Icons

Create placeholder icons in **src-tauri/icons/**:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)

You can use Tauri's icon generator:
```bash
npm run tauri icon path/to/your-icon.png
```

## STEP 6: Final Checklist

```markdown
## Pre-Build Checklist
- [ ] All features working
- [ ] No console errors
- [ ] Theme switching works
- [ ] Settings persist
- [ ] Vault encryption works
- [ ] Clipboard listener works

## Build Checklist
- [ ] npm run tauri build succeeds
- [ ] App launches from build
- [ ] All features work in production build
- [ ] Icons display correctly

## Platform Testing
### macOS
- [ ] DMG opens
- [ ] App runs from Applications
- [ ] Global shortcut works

### Windows  
- [ ] Installer works
- [ ] App runs
- [ ] Global shortcut works

### Linux
- [ ] AppImage runs
- [ ] Global shortcut works
```

## Build Commands

```bash
# Development
npm run tauri dev

# Build for current platform
npm run tauri build

# Build outputs
# macOS: src-tauri/target/release/bundle/dmg/
# Windows: src-tauri/target/release/bundle/msi/
# Linux: src-tauri/target/release/bundle/appimage/
```

## OUTPUT CHECK

- ✅ Build completes without errors
- ✅ App runs from build
- ✅ Icons display correctly
- ✅ All features work in production
- ✅ README is complete

## RELEASE STEPS

1. Update version in package.json and tauri.conf.json
2. Run `npm run tauri build`
3. Test the built app
4. Create GitHub release
5. Upload build artifacts
6. Write changelog
```
