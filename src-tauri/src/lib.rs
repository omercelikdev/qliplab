use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_autostart::MacosLauncher;
use tauri::Emitter;

#[cfg(target_os = "macos")]
use std::process::Command;

#[cfg(target_os = "macos")]
use std::io::Write;

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

/// Sanitize a string for safe use in AppleScript using whitelist approach.
/// Only allows characters that are valid in application names.
#[cfg(target_os = "macos")]
fn sanitize_applescript_string(s: &str) -> String {
    s.chars()
     .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '-' || *c == '.' || *c == '_' || *c == '/' || *c == '(' || *c == ')')
     .take(256)
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

/// Get current frontmost app name (for source tracking and ignore list)
#[cfg(target_os = "macos")]
#[tauri::command]
fn get_frontmost_app() -> Result<String, String> {
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
                Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
            } else {
                Err("Failed to get frontmost app".to_string())
            }
        }
        Err(e) => Err(format!("Failed to get frontmost app: {:?}", e))
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn get_frontmost_app() -> Result<String, String> {
    Ok(String::new())
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
            use core_graphics::event::{CGEvent, CGEventFlags, CGKeyCode, CGEventTapLocation};
            use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

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

                // Small delay for app activation
                thread::sleep(Duration::from_millis(50));
            }

            // Use CGEvent for better compatibility with Electron apps like Teams
            // Key code 9 = V key on macOS
            const V_KEY: CGKeyCode = 9;

            if let Ok(source) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) {
                // Key down with Command modifier
                if let Ok(key_down) = CGEvent::new_keyboard_event(source.clone(), V_KEY, true) {
                    key_down.set_flags(CGEventFlags::CGEventFlagCommand);
                    key_down.post(CGEventTapLocation::HID);
                }

                thread::sleep(Duration::from_millis(10));

                // Key up with Command modifier
                if let Ok(key_up) = CGEvent::new_keyboard_event(source, V_KEY, false) {
                    key_up.set_flags(CGEventFlags::CGEventFlagCommand);
                    key_up.post(CGEventTapLocation::HID);
                }
            } else {
                // Fallback to AppleScript if CGEvent fails
                let paste_script = r#"
                    tell application "System Events"
                        key code 9 using command down
                    end tell
                "#;
                let _ = Command::new("osascript")
                    .arg("-e")
                    .arg(paste_script)
                    .output();
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

/// Simulate Cmd+V (or Ctrl+V) in the CURRENT frontmost app — no app switching.
/// Used by snippet auto-expand where the user is already typing in the target app.
#[tauri::command]
fn simulate_paste_in_place() -> Result<(), String> {
    thread::spawn(|| {
        #[cfg(target_os = "macos")]
        {
            use core_graphics::event::{CGEvent, CGEventFlags, CGKeyCode, CGEventTapLocation};
            use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

            const V_KEY: CGKeyCode = 9;

            if let Ok(source) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) {
                if let Ok(key_down) = CGEvent::new_keyboard_event(source.clone(), V_KEY, true) {
                    key_down.set_flags(CGEventFlags::CGEventFlagCommand);
                    key_down.post(CGEventTapLocation::HID);
                }
                thread::sleep(Duration::from_millis(10));
                if let Ok(key_up) = CGEvent::new_keyboard_event(source, V_KEY, false) {
                    key_up.set_flags(CGEventFlags::CGEventFlagCommand);
                    key_up.post(CGEventTapLocation::HID);
                }
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
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

// --- Trigger Engine: Keystroke monitoring ---

/// Shared state for the trigger engine (source-agnostic: snippets, vault, etc.)
struct TriggerEngineState {
    /// Map of trigger_text → source_id (e.g. "snippet:uuid" or "vault:uuid:field")
    triggers: Vec<(String, String)>,
    /// Whether we're currently expanding (suppress capture)
    expanding: bool,
}

/// Send N backspace key events to delete the trigger text
#[tauri::command]
fn simulate_backspace(count: u32) -> Result<(), String> {
    let count = count.min(500); // Cap at reasonable limit
    thread::spawn(move || {
        #[cfg(target_os = "macos")]
        {
            use core_graphics::event::{CGEvent, CGKeyCode, CGEventTapLocation};
            use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

            const BACKSPACE_KEY: CGKeyCode = 51;

            for _ in 0..count {
                if let Ok(source) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) {
                    if let Ok(key_down) = CGEvent::new_keyboard_event(source.clone(), BACKSPACE_KEY, true) {
                        key_down.post(CGEventTapLocation::HID);
                    }
                    thread::sleep(Duration::from_millis(5));
                    if let Ok(key_up) = CGEvent::new_keyboard_event(source, BACKSPACE_KEY, false) {
                        key_up.post(CGEventTapLocation::HID);
                    }
                    thread::sleep(Duration::from_millis(10));
                }
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
                for _ in 0..count {
                    let _ = enigo.key(Key::Backspace, Direction::Click);
                    thread::sleep(Duration::from_millis(10));
                }
            }
        }
    });

    Ok(())
}

/// Update the trigger map used by the keystroke watcher
#[tauri::command]
fn update_triggers(
    state: tauri::State<'_, Arc<Mutex<TriggerEngineState>>>,
    triggers: Vec<(String, String)>,
) -> Result<(), String> {
    if let Ok(mut s) = state.lock() {
        s.triggers = triggers;
    }
    Ok(())
}

/// Set expanding flag — pauses keystroke capture during trigger expansion
#[tauri::command]
fn set_trigger_expanding(
    state: tauri::State<'_, Arc<Mutex<TriggerEngineState>>>,
    expanding: bool,
) -> Result<(), String> {
    if let Ok(mut s) = state.lock() {
        s.expanding = expanding;
    }
    Ok(())
}

/// Start the keystroke watcher using CGEventTap (macOS) or enigo (Windows).
///
/// Uses CGEventKeyboardGetUnicodeString to read typed characters — this is
/// thread-safe and does NOT call TSMGetInputSourceProperty (which requires main
/// thread and caused crashes with the rdev crate).
#[cfg(target_os = "macos")]
#[tauri::command]
fn start_trigger_engine(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<TriggerEngineState>>>,
) -> Result<(), String> {
    // Raw C FFI declarations for CGEventTap (core-graphics 0.24 doesn't expose these)
    #[allow(non_upper_case_globals)]
    mod cg {
        use std::ffi::c_void;
        pub type CGEventRef = *mut c_void;
        pub type CGEventTapProxy = *mut c_void;
        pub type CFMachPortRef = *mut c_void;

        pub const kCGSessionEventTap: u32 = 1;
        pub const kCGHeadInsertEventTap: u32 = 0;
        pub const kCGEventTapOptionListenOnly: u32 = 1;
        pub const kCGEventMaskForKeyDown: u64 = 1 << 10; // CGEventType::KeyDown = 10
        pub const kCGKeyboardEventKeycode: u32 = 9;

        pub type CGEventTapCallBack = unsafe extern "C" fn(
            proxy: CGEventTapProxy,
            event_type: u32,
            event: CGEventRef,
            user_info: *mut c_void,
        ) -> CGEventRef;

        extern "C" {
            pub fn CGEventTapCreate(
                tap: u32,
                place: u32,
                options: u32,
                events_of_interest: u64,
                callback: CGEventTapCallBack,
                user_info: *mut c_void,
            ) -> CFMachPortRef;

            pub fn CGEventGetIntegerValueField(event: CGEventRef, field: u32) -> i64;

            pub fn CGEventKeyboardGetUnicodeString(
                event: CGEventRef,
                max_len: u64,
                actual_len: *mut u64,
                buf: *mut u16,
            );

            pub fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);

            pub fn CFMachPortCreateRunLoopSource(
                allocator: *const c_void,
                port: CFMachPortRef,
                order: i64,
            ) -> *mut c_void;

            pub fn CFRunLoopAddSource(
                rl: *mut c_void,
                source: *mut c_void,
                mode: *const c_void,
            );

            pub fn CFRunLoopGetCurrent() -> *mut c_void;
            pub fn CFRunLoopRun();

            pub static kCFRunLoopCommonModes: *const c_void;
        }
    }

    // Pending match — used for longest-match disambiguation
    struct PendingMatch {
        trigger: String,
        source_id: String,
        trigger_len: usize,
    }

    // Shared context passed to the C callback via user_info pointer
    struct WatcherContext {
        buffer: String,
        state: Arc<Mutex<TriggerEngineState>>,
        app: tauri::AppHandle,
        tap: cg::CFMachPortRef, // needed to re-enable on timeout
        pending: Option<PendingMatch>, // deferred match awaiting disambiguation
    }

    // Event types we care about
    const CG_EVENT_KEY_DOWN: u32 = 10;
    const CG_EVENT_TAP_DISABLED_BY_TIMEOUT: u32 = 0xFFFFFFFE;

    // Inner callback logic — separated so we can catch panics
    unsafe fn tap_callback_inner(ctx: &mut WatcherContext, event: cg::CGEventRef) {
        const MAX_BUFFER: usize = 100;

        // macOS key codes
        const KEY_RETURN: i64 = 36;
        const KEY_TAB: i64 = 48;
        const KEY_ESCAPE: i64 = 53;
        const KEY_BACKSPACE: i64 = 51;
        const KEY_UP: i64 = 126;
        const KEY_DOWN: i64 = 125;
        const KEY_LEFT: i64 = 123;
        const KEY_RIGHT: i64 = 124;

        // Check if expanding — skip capture
        if let Ok(s) = ctx.state.lock() {
            if s.expanding {
                return;
            }
        }

        let keycode = cg::CGEventGetIntegerValueField(event, cg::kCGKeyboardEventKeycode);

        match keycode {
            KEY_RETURN | KEY_TAB | KEY_ESCAPE |
            KEY_UP | KEY_DOWN | KEY_LEFT | KEY_RIGHT => {
                ctx.pending = None;
                ctx.buffer.clear();
                return;
            }
            KEY_BACKSPACE => {
                ctx.pending = None;
                ctx.buffer.pop();
                return;
            }
            _ => {}
        }

        // Get Unicode string from event (thread-safe, no TSM calls)
        let mut buf = [0u16; 4];
        let mut len: u64 = 0;
        cg::CGEventKeyboardGetUnicodeString(event, buf.len() as u64, &mut len, buf.as_mut_ptr());

        // Clamp len to buffer size (safety)
        let len = (len as usize).min(buf.len());
        if len == 0 {
            return;
        }

        if let Ok(ch) = String::from_utf16(&buf[..len]) {
            // Skip control characters (Cmd+C, Ctrl+A, etc.)
            if ch.chars().all(|c| c.is_control()) {
                return;
            }

            ctx.buffer.push_str(&ch);

            if ctx.buffer.len() > MAX_BUFFER {
                let drain = ctx.buffer.len() - MAX_BUFFER;
                ctx.buffer.drain(..drain);
            }

            if let Ok(s) = ctx.state.lock() {
                // Find the longest matching trigger
                let mut best: Option<(&str, &str, usize)> = None;
                for (trigger, source_id) in &s.triggers {
                    if ctx.buffer.ends_with(trigger.as_str()) {
                        if best.is_none() || trigger.len() > best.unwrap().2 {
                            best = Some((trigger.as_str(), source_id.as_str(), trigger.len()));
                        }
                    }
                }

                if let Some((matched_trigger, matched_id, matched_len)) = best {
                    // Check if any longer trigger starts with matched text
                    let has_longer = s.triggers.iter().any(|(t, _)| {
                        t.len() > matched_len && t.starts_with(matched_trigger)
                    });

                    if has_longer {
                        // Defer — a longer trigger may still complete
                        ctx.pending = Some(PendingMatch {
                            trigger: matched_trigger.to_string(),
                            source_id: matched_id.to_string(),
                            trigger_len: matched_len,
                        });
                    } else {
                        // No longer triggers possible — emit immediately
                        ctx.pending = None;
                        let _ = ctx.app.emit("trigger-matched", serde_json::json!({
                            "trigger": matched_trigger,
                            "sourceId": matched_id,
                            "triggerLen": matched_len
                        }));
                        ctx.buffer.clear();
                        return;
                    }
                } else if ctx.pending.is_some() {
                    // We have a pending short match. Check if typed chars so far
                    // could still lead to a longer trigger completing.
                    let pending = ctx.pending.as_ref().unwrap();
                    // Count chars typed after the pending trigger
                    let extra = ctx.buffer.len().saturating_sub(
                        ctx.buffer.rfind(&pending.trigger).map_or(0, |pos| pos + pending.trigger.len())
                    );
                    let typed_so_far_len = pending.trigger_len + extra;

                    // Check: does any longer trigger match the buffer as a prefix?
                    // e.g. pending=";card", buffer ends with ";card.n", trigger ";card.name" exists
                    let could_still_match = s.triggers.iter().any(|(t, _)| {
                        t.len() > pending.trigger_len
                            && t.starts_with(&pending.trigger)
                            && typed_so_far_len <= t.len()
                            && ctx.buffer.ends_with(&t[..typed_so_far_len])
                    });

                    if !could_still_match {
                        // No longer trigger can match — flush pending + delete extra chars
                        let pending = ctx.pending.take().unwrap();
                        let _ = ctx.app.emit("trigger-matched", serde_json::json!({
                            "trigger": pending.trigger,
                            "sourceId": pending.source_id,
                            "triggerLen": pending.trigger_len + extra
                        }));
                        ctx.buffer.clear();
                        return;
                    }
                }
            }
        }
    }

    // C callback for CGEventTap — must never panic (extern "C" can't unwind)
    unsafe extern "C" fn tap_callback(
        _proxy: cg::CGEventTapProxy,
        event_type: u32,
        event: cg::CGEventRef,
        user_info: *mut std::ffi::c_void,
    ) -> cg::CGEventRef {
        if user_info.is_null() {
            return event;
        }
        let ctx = &mut *(user_info as *mut WatcherContext);

        // Handle tap disabled by timeout — re-enable and return
        if event_type == CG_EVENT_TAP_DISABLED_BY_TIMEOUT {
            if !ctx.tap.is_null() {
                cg::CGEventTapEnable(ctx.tap, true);
            }
            return event;
        }

        // Only process KeyDown events; ignore everything else
        if event_type != CG_EVENT_KEY_DOWN || event.is_null() {
            return event;
        }

        // Catch any panic to prevent abort in extern "C"
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            tap_callback_inner(ctx, event);
        }));

        event // pass through (ListenOnly)
    }

    let state = Arc::clone(&state);

    thread::spawn(move || {
        // Create context first with null tap — we'll set the tap after creation
        let mut ctx = Box::new(WatcherContext {
            buffer: String::new(),
            state,
            app,
            tap: std::ptr::null_mut(),
            pending: None,
        });

        unsafe {
            let tap = cg::CGEventTapCreate(
                cg::kCGSessionEventTap,
                cg::kCGHeadInsertEventTap,
                cg::kCGEventTapOptionListenOnly,
                cg::kCGEventMaskForKeyDown,
                tap_callback,
                &mut *ctx as *mut WatcherContext as *mut std::ffi::c_void,
            );

            if tap.is_null() {
                eprintln!("[TriggerEngine] Failed to create CGEventTap — check Accessibility permissions");
                return;
            }

            // Store tap reference so callback can re-enable on timeout
            ctx.tap = tap;

            cg::CGEventTapEnable(tap, true);

            let source = cg::CFMachPortCreateRunLoopSource(
                std::ptr::null(),
                tap,
                0,
            );

            let rl = cg::CFRunLoopGetCurrent();
            cg::CFRunLoopAddSource(rl, source, cg::kCFRunLoopCommonModes);

            // Block this thread on the run loop
            cg::CFRunLoopRun();
        }

        // ctx lives until thread ends (run loop blocks forever)
        drop(ctx);
    });

    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn start_trigger_engine(
    _app: tauri::AppHandle,
    _state: tauri::State<'_, Arc<Mutex<TriggerEngineState>>>,
) -> Result<(), String> {
    // Windows/Linux: trigger engine not yet supported
    Ok(())
}

/// OCR: Extract text from image using macOS Vision framework
#[cfg(target_os = "macos")]
#[tauri::command]
async fn ocr_image(base64_data: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    // Decode base64 to image bytes
    let image_bytes = STANDARD.decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Write to temp file with random name to prevent race conditions
    let temp_path = std::env::temp_dir().join(format!("qliplab_ocr_{}.png", std::process::id()));
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|_| "Failed to create temp file".to_string())?;
    file.write_all(&image_bytes)
        .map_err(|_| "Failed to write temp file".to_string())?;
    drop(file);

    // Set restrictive permissions on temp file
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&temp_path, std::fs::Permissions::from_mode(0o600));
    }

    // Run Swift script for Vision OCR — pass path via env var to prevent injection
    let swift_script = r#"
import Vision
import AppKit
import Foundation

let filePath = ProcessInfo.processInfo.environment["QLIPLAB_OCR_PATH"] ?? ""
guard let image = NSImage(contentsOfFile: filePath),
      let tiffData = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData),
      let cgImage = bitmap.cgImage else {
    print("")
    exit(0)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage)
do {
    try handler.perform([request])
} catch {
    print("")
    exit(0)
}

let text = request.results?
    .compactMap { ($0 as? VNRecognizedTextObservation)?.topCandidates(1).first?.string }
    .joined(separator: "\n") ?? ""
print(text)
"#;

    let output = Command::new("swift")
        .arg("-e")
        .arg(swift_script)
        .env("QLIPLAB_OCR_PATH", temp_path.to_string_lossy().as_ref())
        .output()
        .map_err(|_| "Failed to run OCR".to_string())?;

    // Cleanup temp file
    if let Err(e) = std::fs::remove_file(&temp_path) {
        eprintln!("[ocr_image] Failed to cleanup temp file: {:?}", e);
    }

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(text)
    } else {
        Err("OCR processing failed".to_string())
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
async fn ocr_image(_base64_data: String) -> Result<String, String> {
    Err("OCR is only available on macOS".to_string())
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

    // Window levels - use popup menu level (101) instead of screen saver level (1000)
    // Screen saver level appears above lock screen and can capture input when Mac is locked
    // Popup menu level is high enough for Spotlight-like behavior but stays below lock screen
    #[allow(non_upper_case_globals)]
    const NSPopUpMenuWindowLevel: i32 = 101;

    // Set panel to popup menu level - appears above most apps but below lock screen
    panel.set_level(NSPopUpMenuWindowLevel);

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

    // Also hide the panel immediately to ensure it doesn't capture events on startup
    // This is especially important for autostart scenarios
    panel.order_out(None);

    Ok(())
}

/// Write base64 image to a temp file for drag & drop
#[tauri::command]
fn write_temp_image(base64_data: String) -> Result<String, String> {
    use base64::Engine;
    let file_path = std::env::temp_dir().join(format!("qliplab_drag_{}.png", std::process::id()));
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|_| "Base64 decode failed".to_string())?;
    std::fs::write(&file_path, &bytes).map_err(|_| "Failed to write temp file".to_string())?;

    // Set restrictive permissions
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o600));
    }

    file_path.to_str().map(|s| s.to_string()).ok_or_else(|| "Invalid path".to_string())
}

/// List all installed and running applications (macOS only)
/// Returns tuples of (app_name, is_running)
#[cfg(target_os = "macos")]
#[tauri::command]
fn list_running_apps() -> Result<Vec<(String, bool)>, String> {
    use std::collections::HashSet;

    // Get running (non-background) process names via AppleScript
    let mut running_names = HashSet::new();
    let script = r#"
        tell application "System Events"
            set appNames to name of every application process whose background only is false
            set output to ""
            repeat with appName in appNames
                set output to output & appName & "\n"
            end repeat
            return output
        end tell
    "#;
    if let Ok(output) = Command::new("osascript").arg("-e").arg(script).output() {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let name = line.trim();
                if !name.is_empty() {
                    running_names.insert(name.to_lowercase());
                }
            }
        }
    }

    // Scan /Applications and ~/Applications
    let mut all_apps: Vec<(String, bool)> = Vec::new();
    let mut seen = HashSet::new();

    let mut app_dirs = vec![std::path::PathBuf::from("/Applications")];
    if let Ok(home) = std::env::var("HOME") {
        app_dirs.push(std::path::PathBuf::from(home).join("Applications"));
    }
    // Also include /System/Applications for system apps like Finder
    app_dirs.push(std::path::PathBuf::from("/System/Applications"));

    for dir in app_dirs {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "app") {
                    if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                        let name = name.to_string();
                        if seen.insert(name.to_lowercase()) {
                            // Match by case-insensitive name or common short aliases
                            let is_running = running_names.contains(&name.to_lowercase());
                            all_apps.push((name, is_running));
                        }
                    }
                }
            }
        }
    }

    // Also add any running apps not found in /Applications (e.g., helper processes with visible windows)
    for running in &running_names {
        if !seen.contains(running) {
            // Capitalize first letter of each word for display
            let display_name: String = running
                .split_whitespace()
                .map(|w| {
                    let mut chars = w.chars();
                    match chars.next() {
                        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
                        None => String::new(),
                    }
                })
                .collect::<Vec<_>>()
                .join(" ");
            all_apps.push((display_name, true));
        }
    }

    // Sort: running first, then alphabetical
    all_apps.sort_by(|a, b| {
        b.1.cmp(&a.1).then_with(|| a.0.to_lowercase().cmp(&b.0.to_lowercase()))
    });

    Ok(all_apps)
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn list_running_apps() -> Result<Vec<(String, bool)>, String> {
    use std::collections::HashSet;
    // Get visible-window processes via PowerShell
    let mut running = HashSet::new();
    if let Ok(output) = std::process::Command::new("powershell")
        .args(["-Command", "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -ExpandProperty ProcessName | Sort-Object -Unique"])
        .output()
    {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let name = line.trim();
                if !name.is_empty() {
                    running.insert(name.to_lowercase());
                }
            }
        }
    }

    // Get installed apps from Start Menu shortcuts
    let mut all_apps: Vec<(String, bool)> = Vec::new();
    let mut seen = HashSet::new();

    let mut dirs = Vec::new();
    if let Ok(appdata) = std::env::var("APPDATA") {
        dirs.push(std::path::PathBuf::from(appdata).join("Microsoft\\Windows\\Start Menu\\Programs"));
    }
    dirs.push(std::path::PathBuf::from("C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs"));

    for dir in dirs {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "lnk") {
                    if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                        let name = name.to_string();
                        if seen.insert(name.to_lowercase()) {
                            let is_running = running.contains(&name.to_lowercase());
                            all_apps.push((name, is_running));
                        }
                    }
                }
            }
        }
    }

    // Add running apps not found in Start Menu
    for r in &running {
        if !seen.contains(r) {
            let display: String = r.chars().next().map(|c| c.to_uppercase().collect::<String>() + &r[1..]).unwrap_or_default();
            all_apps.push((display, true));
        }
    }

    all_apps.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.to_lowercase().cmp(&b.0.to_lowercase())));
    Ok(all_apps)
}

#[cfg(target_os = "linux")]
#[tauri::command]
fn list_running_apps() -> Result<Vec<(String, bool)>, String> {
    use std::collections::HashSet;
    // Get running desktop apps via wmctrl or ps
    let mut running = HashSet::new();
    if let Ok(output) = std::process::Command::new("ps")
        .args(["-eo", "comm"])
        .output()
    {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines().skip(1) {
                let name = line.trim();
                if !name.is_empty() {
                    running.insert(name.to_lowercase());
                }
            }
        }
    }

    // List .desktop files
    let mut all_apps: Vec<(String, bool)> = Vec::new();
    let mut seen = HashSet::new();
    let app_dirs = vec![
        std::path::PathBuf::from("/usr/share/applications"),
        std::path::PathBuf::from("/usr/local/share/applications"),
    ];
    if let Ok(home) = std::env::var("HOME") {
        let _ = app_dirs.clone(); // just for the push below
    }

    for dir in &app_dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "desktop") {
                    if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                        let name = name.to_string();
                        if seen.insert(name.to_lowercase()) {
                            let is_running = running.contains(&name.to_lowercase());
                            all_apps.push((name, is_running));
                        }
                    }
                }
            }
        }
    }

    all_apps.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.to_lowercase().cmp(&b.0.to_lowercase())));
    Ok(all_apps)
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
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_drag::init());

    // Add nspanel plugin on macOS
    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .manage(Arc::new(Mutex::new(TriggerEngineState {
            triggers: Vec::new(),
            expanding: false,
        })))
        .invoke_handler(tauri::generate_handler![
            simulate_paste,
            simulate_paste_in_place,
            save_frontmost_app,
            get_frontmost_app,
            show_panel,
            hide_panel,
            ocr_image,
            simulate_backspace,
            update_triggers,
            set_trigger_expanding,
            start_trigger_engine,
            list_running_apps,
            write_temp_image
        ])
        .setup(|app| {
            // macOS: Hide dock icon
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Setup tray icon
            {
                let show_item = MenuItemBuilder::with_id("show", "Show qliplab")
                    .build(app)?;
                let quit_item = MenuItemBuilder::with_id("quit", "Quit")
                    .build(app)?;
                let menu = MenuBuilder::new(app)
                    .item(&show_item)
                    .separator()
                    .item(&quit_item)
                    .build()?;

                let mut tray_builder = TrayIconBuilder::new();
                if let Some(icon) = app.default_window_icon().cloned() {
                    tray_builder = tray_builder.icon(icon);
                }
                let _tray = tray_builder
                    .icon_as_template(true)
                    .menu(&menu)
                    .on_menu_event(|app, event| {
                        match event.id().as_ref() {
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                #[cfg(target_os = "macos")]
                                {
                                    if let Ok(panel) = app.get_webview_panel("main") {
                                        panel.set_ignore_mouse_events(false);
                                        panel.show();
                                    }
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            // macOS: Convert window to panel for Spotlight-like behavior
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(e) = init_panel(window) {
                        eprintln!("Warning: Panel initialization failed: {}. App will continue with limited functionality.", e);
                    }

                    // In debug mode, don't auto-show panel to prevent input capture
                    // Use Cmd+Shift+V to show the panel when needed
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
