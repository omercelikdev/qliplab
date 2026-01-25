use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

#[cfg(target_os = "macos")]
use std::process::Command;

#[cfg(target_os = "macos")]
use tauri_nspanel::{
    ManagerExt, WebviewWindowExt,
    cocoa::appkit::NSWindowCollectionBehavior,
};

#[cfg(not(target_os = "macos"))]
use enigo::{Enigo, Keyboard, Settings, Key, Direction};

// Store the previously active application
#[cfg(target_os = "macos")]
static PREVIOUS_APP: Mutex<Option<String>> = Mutex::new(None);

/// Sanitize a string for safe use in AppleScript
/// Removes dangerous characters to prevent injection attacks
#[cfg(target_os = "macos")]
fn sanitize_applescript_string(s: &str) -> String {
    // Remove characters that could break out of AppleScript string context
    // Normal app names never contain these characters
    s.chars()
     .filter(|c| *c != '"' && *c != '\\' && *c != '\n' && *c != '\r')
     .collect()
}

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

/// Show panel on current space (macOS)
#[cfg(target_os = "macos")]
#[tauri::command]
fn show_panel(app: tauri::AppHandle) -> Result<(), String> {
    if let Ok(panel) = app.get_webview_panel("main") {
        // Re-enable mouse events before showing
        panel.set_ignore_mouse_events(false);
        panel.show();
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn show_panel(_app: tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

/// Hide panel (macOS)
#[cfg(target_os = "macos")]
#[tauri::command]
fn hide_panel(app: tauri::AppHandle) -> Result<(), String> {
    if let Ok(panel) = app.get_webview_panel("main") {
        // Disable mouse events BEFORE hiding to prevent input capture
        panel.set_ignore_mouse_events(true);
        panel.order_out(None);
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn hide_panel(_app: tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn simulate_paste() -> Result<(), String> {
    thread::spawn(|| {
        #[cfg(target_os = "macos")]
        {
            let prev_app = PREVIOUS_APP.lock().ok().and_then(|guard| guard.clone());

            if let Some(app_name) = prev_app {
                // SECURITY: Sanitize app name to prevent AppleScript injection
                let safe_app_name = sanitize_applescript_string(&app_name);
                let activate_script = format!(
                    r#"tell application "{}" to activate"#,
                    safe_app_name
                );

                let _ = Command::new("osascript")
                    .arg("-e")
                    .arg(&activate_script)
                    .output();

                // Reduced delay - app activation is usually fast
                thread::sleep(Duration::from_millis(30));
            }

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

/// Initialize panel with proper settings for Spotlight-like behavior
#[cfg(target_os = "macos")]
fn init_panel(window: tauri::WebviewWindow) -> Result<(), String> {
    // Convert window to panel with proper error handling
    let panel = match window.to_panel() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Failed to convert window to panel: {:?}", e);
            return Err(format!("Panel initialization failed: {:?}", e));
        }
    };

    // Window levels
    #[allow(non_upper_case_globals)]
    const NSScreenSaverWindowLevel: i32 = 1000;

    // Set panel to screen saver level to appear above fullscreen apps
    panel.set_level(NSScreenSaverWindowLevel);

    // Style mask for non-activating panel + resizable
    #[allow(non_upper_case_globals)]
    const NSWindowStyleMaskResizable: i32 = 1 << 3;
    #[allow(non_upper_case_globals)]
    const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;
    panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel | NSWindowStyleMaskResizable);

    // Collection behavior for:
    // - Display on same space as fullscreen window
    // - Join all spaces (appear on every desktop/space)
    // - Transient (don't persist when app quits)
    // - Move to active space
    panel.set_collection_behaviour(
        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorTransient
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle,
    );

    // CRITICAL: Ignore mouse events when panel starts hidden
    // This prevents the invisible panel from capturing trackpad input
    panel.set_ignore_mouse_events(true);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"])));

    // Add nspanel plugin on macOS
    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            simulate_paste,
            save_frontmost_app,
            show_panel,
            hide_panel
        ])
        .setup(|app| {
            // macOS: Hide dock icon
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // macOS: Convert window to panel for Spotlight-like behavior
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(e) = init_panel(window) {
                        eprintln!("Warning: Panel initialization failed: {}. App will continue with limited functionality.", e);
                    }

                    // Show panel on first launch for development
                    #[cfg(debug_assertions)]
                    {
                        if let Ok(panel) = app.get_webview_panel("main") {
                            panel.set_ignore_mouse_events(false);
                            panel.show();
                        }
                    }
                }
            }

            // Non-macOS: Regular window handling
            #[cfg(not(target_os = "macos"))]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_visible_on_all_workspaces(true);

                    #[cfg(debug_assertions)]
                    {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
