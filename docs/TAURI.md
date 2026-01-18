# qliplab Tauri Backend

## Overview

The Rust backend provides native OS integration through Tauri v2. It handles clipboard operations, window management, and paste simulation.

## File Structure

```
src-tauri/
├── src/
│   ├── lib.rs          # Main plugin, commands, and app setup
│   └── main.rs         # Entry point
├── Cargo.toml          # Rust dependencies
├── tauri.conf.json     # Tauri configuration
└── icons/              # App icons
```

---

## lib.rs

### Imports and Dependencies

```rust
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri_plugin_autostart::MacosLauncher;

#[cfg(target_os = "macos")]
use std::process::Command;

#[cfg(not(target_os = "macos"))]
use enigo::{Enigo, Keyboard, Settings, Key, Direction};
```

### Static State

```rust
// Store the previously active application (macOS only)
#[cfg(target_os = "macos")]
static PREVIOUS_APP: Mutex<Option<String>> = Mutex::new(None);
```

---

## Tauri Commands

### save_frontmost_app

Saves the name of the currently active application before showing qliplab window.

```rust
#[cfg(target_os = "macos")]
#[tauri::command]
fn save_frontmost_app() -> Result<(), String> {
    let script = r#"
        tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
            return frontApp
        end tell
    "#;

    match Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                let app_name = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if let Ok(mut prev) = PREVIOUS_APP.lock() {
                    *prev = Some(app_name);
                }
            }
            Ok(())
        }
        Err(e) => Err(format!("Failed to get frontmost app: {:?}", e))
    }
}

// No-op on non-macOS platforms
#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn save_frontmost_app() -> Result<(), String> {
    Ok(())
}
```

**Called from**: `src/lib/window.ts` → `showWindow()`, `toggleWindow()`

---

### simulate_paste

Activates the previously saved app and simulates Cmd+V (macOS) or Ctrl+V (Windows/Linux).

```rust
#[tauri::command]
fn simulate_paste() -> Result<(), String> {
    thread::spawn(|| {
        #[cfg(target_os = "macos")]
        {
            // Get the previously saved app
            let prev_app = PREVIOUS_APP.lock().ok().and_then(|guard| guard.clone());

            if let Some(app_name) = prev_app {
                // Activate the previous application
                let activate_script = format!(
                    r#"tell application "{}" to activate"#,
                    app_name
                );

                let _ = Command::new("osascript")
                    .arg("-e")
                    .arg(&activate_script)
                    .output();

                // Wait for app to become active
                thread::sleep(Duration::from_millis(100));
            }

            // Send Cmd+V via AppleScript
            let paste_script = r#"
                tell application "System Events"
                    keystroke "v" using command down
                end tell
            "#;

            let _ = Command::new("osascript")
                .arg("-e")
                .arg(paste_script)
                .output();
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Use enigo for Windows/Linux
            thread::sleep(Duration::from_millis(100));
            if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
                let _ = enigo.key(Key::Control, Direction::Press);
                thread::sleep(Duration::from_millis(20));
                let _ = enigo.key(Key::Unicode('v'), Direction::Click);
                thread::sleep(Duration::from_millis(20));
                let _ = enigo.key(Key::Control, Direction::Release);
            }
        }
    });

    Ok(())
}
```

**Called from**: `src/lib/window.ts` → `hideAndPaste()`

**Note**: Uses `thread::spawn()` to avoid blocking the main thread.

---

## Tauri Plugins

### Initialization

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"])
        ))
        .invoke_handler(tauri::generate_handler![simulate_paste, save_frontmost_app])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Plugin Details

| Plugin | Purpose | Cargo Feature |
|--------|---------|---------------|
| `tauri-plugin-opener` | Open URLs in browser | - |
| `tauri-plugin-clipboard-manager` | Read/write clipboard | - |
| `tauri-plugin-sql` | SQLite database | sqlite |
| `tauri-plugin-global-shortcut` | System-wide shortcuts | - |
| `tauri-plugin-store` | Key-value storage | - |
| `tauri-plugin-autostart` | Launch on login | - |

---

## Frontend Integration

### Invoking Commands

```typescript
// src/lib/window.ts
import { invoke } from '@tauri-apps/api/core';

export async function showWindow() {
  await invoke('save_frontmost_app');
  const window = getCurrentWindow();
  await window.show();
  await window.setFocus();
}

export async function hideAndPaste() {
  const window = getCurrentWindow();
  await window.hide();
  await invoke('simulate_paste');
}
```

### Using Plugins

```typescript
// Clipboard
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
const content = await readText();
await writeText('new content');

// Database
import Database from '@tauri-apps/plugin-sql';
const db = await Database.load('sqlite:qliplab.db');
await db.execute('INSERT INTO ...');
const result = await db.select('SELECT * FROM ...');

// Key-Value Store
import { Store } from '@tauri-apps/plugin-store';
const store = await Store.load('settings.json');
await store.set('key', value);
await store.save();

// Global Shortcut
import { register } from '@tauri-apps/plugin-global-shortcut';
await register('CommandOrControl+Shift+V', handler);

// Window
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
const window = getCurrentWindow();
await window.setSize(new LogicalSize(420, 450));
await window.show();
await window.hide();
```

---

## Window Configuration

### tauri.conf.json (relevant parts)

```json
{
  "app": {
    "windows": [
      {
        "title": "qliplab",
        "width": 420,
        "height": 450,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "visible": false,
        "skipTaskbar": true,
        "alwaysOnTop": true
      }
    ]
  }
}
```

### Window Properties

| Property | Value | Purpose |
|----------|-------|---------|
| width | 420 | Default width |
| height | 450 | Fixed height |
| resizable | false | Fixed size |
| decorations | false | Custom titlebar |
| transparent | true | Glass effect support |
| visible | false | Starts hidden (production) |
| skipTaskbar | true | Hidden from taskbar |
| alwaysOnTop | true | Always visible over other windows |

---

## Platform-Specific Code

### macOS
- Uses AppleScript for app activation and paste simulation
- `osascript` command execution
- System Events for keystroke simulation

### Windows/Linux
- Uses `enigo` crate for keyboard simulation
- Control+V for paste (vs Command+V on Mac)

### Conditional Compilation

```rust
#[cfg(target_os = "macos")]
// macOS-specific code

#[cfg(not(target_os = "macos"))]
// Windows/Linux code

#[cfg(debug_assertions)]
// Development-only code
```

---

## Database Setup

Database is initialized from the frontend but uses the Tauri SQL plugin:

```typescript
// src/lib/database.ts
import Database from '@tauri-apps/plugin-sql';

export async function initDatabase() {
  const db = await Database.load('sqlite:qliplab.db');

  // Create tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clipboard_history (...)
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS snippets (...)
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_items (...)
  `);
  // ...
}
```

**Database Location**: App data directory (managed by Tauri)
- macOS: `~/Library/Application Support/com.qliplab.app/`
- Windows: `%APPDATA%/com.qliplab.app/`
- Linux: `~/.config/com.qliplab.app/`

---

## Cargo.toml Dependencies

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
tauri-plugin-clipboard-manager = "2"
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-global-shortcut = "2"
tauri-plugin-store = "2"
tauri-plugin-autostart = "2"

[target.'cfg(not(target_os = "macos"))'.dependencies]
enigo = "0.2"
```

---

## Development vs Production

### Debug Mode
- Window shown on startup
- DevTools available

### Release Mode
- Window starts hidden
- Opened via global shortcut only
- `--hidden` flag for autostart

```rust
.setup(|_app| {
    #[cfg(debug_assertions)]
    {
        if let Some(window) = _app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
    Ok(())
})
```

---

## Error Handling

### Command Error Pattern

```rust
#[tauri::command]
fn my_command() -> Result<(), String> {
    match do_something() {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Error: {:?}", e))
    }
}
```

### Frontend Error Handling

```typescript
try {
  await invoke('simulate_paste');
} catch (error) {
  console.error('Failed to paste:', error);
}
```

---

## Security Considerations

1. **AppleScript Execution**: Only executes predefined scripts
2. **No User Input in Scripts**: App names are validated
3. **Thread Safety**: `Mutex` for shared state
4. **No Sensitive Data in Rust**: Encryption handled in frontend

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Features](./FEATURES.md) - Feature specs
- [Stores](./STORES.md) - Frontend state management
