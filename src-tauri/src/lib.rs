use std::sync::Mutex;
use std::thread;
use std::time::Duration;
#[cfg(debug_assertions)]
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

#[cfg(target_os = "macos")]
use std::process::Command;

#[cfg(not(target_os = "macos"))]
use enigo::{Enigo, Keyboard, Settings, Key, Direction};

// Store the previously active application
#[cfg(target_os = "macos")]
static PREVIOUS_APP: Mutex<Option<String>> = Mutex::new(None);

#[cfg(target_os = "macos")]
#[tauri::command]
fn save_frontmost_app() -> Result<(), String> {
    // Get the frontmost application before our window appears
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
                    *prev = Some(app_name.clone());
                }
            }
            Ok(())
        }
        Err(e) => Err(format!("Failed to get frontmost app: {:?}", e))
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn save_frontmost_app() -> Result<(), String> {
    Ok(())
}

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

            // Now paste
            let paste_script = r#"
                tell application "System Events"
                    keystroke "v" using command down
                end tell
            "#;

            match Command::new("osascript")
                .arg("-e")
                .arg(paste_script)
                .output()
            {
                Ok(output) => {
                    if !output.status.success() {
                        eprintln!("AppleScript paste failed: {:?}", String::from_utf8_lossy(&output.stderr));
                    }
                }
                Err(e) => {
                    eprintln!("Failed to execute AppleScript: {:?}", e);
                }
            }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .invoke_handler(tauri::generate_handler![simulate_paste, save_frontmost_app])
        .setup(|_app| {
            // Show window on first launch for development
            // In production, window starts hidden and is shown via shortcut
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
