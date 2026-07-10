use std::sync::atomic::{AtomicBool, Ordering};
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

/// Unified logging — writes to a file in the app's temp dir.
/// macOS: /tmp/qliplab-debug.log (dev) or ~/Library/Containers/com.qliplab.app/Data/tmp/qliplab-debug.log (sandbox)
/// Windows: %TEMP%\qliplab-debug.log (typically C:\Users\<user>\AppData\Local\Temp\qliplab-debug.log)
/// Linux: /tmp/qliplab-debug.log
fn qlip_log(msg: &str) {
    use std::fs::OpenOptions;
    let path = std::env::temp_dir().join("qliplab-debug.log");
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| {
                let secs = d.as_secs();
                let h = (secs / 3600) % 24;
                let m = (secs / 60) % 60;
                let s = secs % 60;
                let ms = d.subsec_millis();
                format!("{:02}:{:02}:{:02}.{:03}", h, m, s, ms)
            })
            .unwrap_or_default();
        let _ = std::io::Write::write_fmt(&mut f, format_args!("[{}] {}\n", now, msg));
    }
}

#[cfg(target_os = "macos")]
#[allow(deprecated)]
use tauri_nspanel::{
    ManagerExt, WebviewWindowExt,
    cocoa::appkit::NSWindowCollectionBehavior,
};

#[cfg(not(target_os = "macos"))]
use enigo::{Enigo, Keyboard, Settings, Key, Direction};

// Store the previously active application as (pid, name) for reliable activation.
// PID is primary (unique per process), name is for logging and fallback matching.
#[cfg(target_os = "macos")]
static PREVIOUS_APP: Mutex<Option<(i32, String)>> = Mutex::new(None);

// Store the previously active window handle (Windows)
#[cfg(target_os = "windows")]
static PREVIOUS_HWND: Mutex<Option<isize>> = Mutex::new(None);

// The OS keystroke watcher (CGEventTap / rdev) cannot be torn down cleanly once
// its run loop is spawned, so start it at most once per process. Without this,
// toggling "snippet auto-expand" off and on again spawned a second watcher and
// every trigger expanded twice.
static TRIGGER_ENGINE_RUNNING: AtomicBool = AtomicBool::new(false);
// Whether the running watcher should act on keystrokes. Cleared by
// `stop_trigger_engine` so disabling the setting really does stop expansion.
static TRIGGER_ENGINE_ENABLED: AtomicBool = AtomicBool::new(false);

// --- Native Cocoa helpers (macOS) ---
// Replace all osascript/AppleScript calls with direct Cocoa API access.
// This removes the need for com.apple.security.automation.apple-events and
// com.apple.security.temporary-exception.apple-events entitlements,
// which are routinely rejected by App Store Review.

/// Get frontmost application info via NSWorkspace (no AppleScript needed).
/// Returns (pid, name) or None if no frontmost app.
#[cfg(target_os = "macos")]
fn cocoa_frontmost_app() -> Option<(i32, String)> {
    use objc2_app_kit::NSWorkspace;
    let workspace = NSWorkspace::sharedWorkspace();
    let app = workspace.frontmostApplication()?;
    let name = app.localizedName()?.to_string();
    let pid = app.processIdentifier();
    if pid > 0 { Some((pid, name)) } else { None }
}

/// Activate an application by PID via NSRunningApplication (no AppleScript needed).
/// Returns true if activation succeeded.
#[cfg(target_os = "macos")]
fn cocoa_activate_app(pid: i32) -> bool {
    use objc2_app_kit::{NSRunningApplication, NSApplicationActivationOptions};
    if let Some(app) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) {
        #[allow(deprecated)] // ActivateIgnoringOtherApps deprecated in macOS 14 but still works
        app.activateWithOptions(NSApplicationActivationOptions::ActivateIgnoringOtherApps)
    } else {
        false
    }
}

/// List all running (non-background) applications via NSWorkspace.
/// Returns Vec of (name, pid) for all regular apps.
#[cfg(target_os = "macos")]
fn cocoa_running_apps() -> Vec<(String, i32)> {
    use objc2_app_kit::NSWorkspace;
    let workspace = NSWorkspace::sharedWorkspace();
    let apps = workspace.runningApplications();
    apps.iter()
        .filter(|app| app.activationPolicy() == objc2_app_kit::NSApplicationActivationPolicy::Regular)
        .filter_map(|app| {
            let name = app.localizedName()?.to_string();
            let pid = app.processIdentifier();
            Some((name, pid))
        })
        .collect()
}

// --- CGEvent helpers (macOS) ---
// CGEvent.post requires Accessibility (kTCCServiceAccessibility) permission.
// This is separate from Apple Events — removing apple-events entitlements has zero effect.

#[cfg(target_os = "macos")]
extern "C" {
    /// Returns true if the app has Accessibility permission (macOS 10.15+).
    fn CGPreflightPostEventAccess() -> bool;
    /// Requests Accessibility permission, showing the TCC dialog if needed (macOS 10.15+).
    fn CGRequestPostEventAccess() -> bool;
}

/// Whether the app may post synthetic keyboard events.
///
/// On macOS this is the Accessibility (kTCCServiceAccessibility) grant that
/// auto-paste and snippet auto-expand both depend on. Windows and Linux paste
/// through enigo and need no such grant, so they always report granted.
#[tauri::command]
fn accessibility_granted() -> bool {
    #[cfg(target_os = "macos")]
    {
        unsafe { CGPreflightPostEventAccess() }
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

/// Ask macOS for Accessibility permission, showing the TCC dialog when possible.
/// Returns the permission state after the request. No-op (true) elsewhere.
#[tauri::command]
fn request_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        unsafe { CGRequestPostEventAccess() }
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

/// Open the macOS Accessibility settings pane so the user can grant permission.
#[tauri::command]
fn open_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Post Cmd+V via CGEvent using Session tap (Maccy App Store best practice).
/// Session tap doesn't annotate events with process info, avoiding sandbox blocking.
#[cfg(target_os = "macos")]
fn paste_via_cgevent() -> bool {
    use core_graphics::event::{CGEvent, CGEventFlags, CGKeyCode, CGEventTapLocation};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
    const V_KEY: CGKeyCode = 9;

    // Check accessibility permission first
    let has_access = unsafe { CGPreflightPostEventAccess() };
    qlip_log(&format!("paste_via_cgevent: CGPreflightPostEventAccess={}", has_access));

    match CGEventSource::new(CGEventSourceStateID::CombinedSessionState) {
        Ok(source) => {
            match CGEvent::new_keyboard_event(source.clone(), V_KEY, true) {
                Ok(key_down) => {
                    key_down.set_flags(CGEventFlags::CGEventFlagCommand);
                    key_down.post(CGEventTapLocation::Session);
                    qlip_log("paste_via_cgevent: key_down posted (Session tap)");
                    thread::sleep(Duration::from_millis(10));
                    if let Ok(key_up) = CGEvent::new_keyboard_event(source, V_KEY, false) {
                        key_up.set_flags(CGEventFlags::CGEventFlagCommand);
                        key_up.post(CGEventTapLocation::Session);
                        qlip_log("paste_via_cgevent: key_up posted → SUCCESS");
                        return true;
                    } else {
                        qlip_log("paste_via_cgevent: FAILED to create key_up event");
                    }
                }
                Err(()) => {
                    qlip_log("paste_via_cgevent: FAILED to create key_down event");
                }
            }
        }
        Err(()) => {
            qlip_log("paste_via_cgevent: FAILED to create CGEventSource");
        }
    }
    false
}

/// Post a single key code via CGEvent (Session tap). Returns true on success.
#[cfg(target_os = "macos")]
fn post_key_via_cgevent(key_code: u16) -> bool {
    use core_graphics::event::{CGEvent, CGEventTapLocation};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    if let Ok(source) = CGEventSource::new(CGEventSourceStateID::CombinedSessionState) {
        if let Ok(key_down) = CGEvent::new_keyboard_event(source.clone(), key_code, true) {
            key_down.post(CGEventTapLocation::Session);
            thread::sleep(Duration::from_millis(5));
            if let Ok(key_up) = CGEvent::new_keyboard_event(source, key_code, false) {
                key_up.post(CGEventTapLocation::Session);
                return true;
            }
        }
    }
    false
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn save_frontmost_app() -> Result<(), String> {
    if let Some((pid, name)) = cocoa_frontmost_app() {
        qlip_log(&format!("save_frontmost_app: captured '{}' (pid={})", name, pid));
        if let Ok(mut prev) = PREVIOUS_APP.lock() {
            *prev = Some((pid, name));
        }
    } else {
        qlip_log("save_frontmost_app: no frontmost app found");
    }
    Ok(())
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn save_frontmost_app() -> Result<(), String> {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    let hwnd = unsafe { GetForegroundWindow() };
    qlip_log(&format!("save_frontmost_app [win]: hwnd={}", hwnd.0 as isize));
    if let Ok(mut guard) = PREVIOUS_HWND.lock() {
        *guard = Some(hwnd.0 as isize);
    }
    Ok(())
}

#[cfg(target_os = "linux")]
#[tauri::command]
fn save_frontmost_app() -> Result<(), String> {
    Ok(())
}

/// Get current frontmost app name (for source tracking and ignore list)
#[cfg(target_os = "macos")]
#[tauri::command]
fn get_frontmost_app() -> Result<String, String> {
    match cocoa_frontmost_app() {
        Some((_pid, name)) => Ok(name),
        None => Ok(String::new()),
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn get_frontmost_app() -> Result<String, String> {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    use windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId;
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

    unsafe {
        let hwnd = GetForegroundWindow();
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return Ok(String::new());
        }

        // Get process name via OpenProcess + QueryFullProcessImageNameW
        if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            let mut buf = [0u16; 260];
            let mut len = buf.len() as u32;
            let ok = windows::Win32::System::Threading::QueryFullProcessImageNameW(
                handle,
                windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0),
                windows::core::PWSTR(buf.as_mut_ptr()),
                &mut len,
            );
            let _ = windows::Win32::Foundation::CloseHandle(handle);
            if ok.is_ok() {
                let path = String::from_utf16_lossy(&buf[..len as usize]);
                // Extract filename without extension
                let name = path.rsplit('\\').next().unwrap_or("")
                    .trim_end_matches(".exe")
                    .to_string();
                return Ok(name);
            }
        }
    }
    Ok(String::new())
}

#[cfg(target_os = "linux")]
#[tauri::command]
fn get_frontmost_app() -> Result<String, String> {
    Ok(String::new())
}

/// Show panel on current space (macOS)
/// Falls back to standard window API if NSPanel is unavailable (e.g. macOSPrivateApi: false)
#[cfg(target_os = "macos")]
#[tauri::command]
fn show_panel(app: tauri::AppHandle) -> Result<(), String> {
    // CRITICAL: Save frontmost app BEFORE showing panel via native NSWorkspace API.
    // Even with NSPanel, the panel.show() call may trigger focus changes.
    // By capturing here (inside Rust, synchronously before show), we guarantee
    // the correct previous app is saved before any window system events fire.
    if let Some((pid, name)) = cocoa_frontmost_app() {
        // Don't save QlipLab itself as the previous app
        if name != "qliplab" && name != "QlipLab" {
            qlip_log(&format!("show_panel: saved frontmost app '{}' (pid={}) before showing", name, pid));
            if let Ok(mut prev) = PREVIOUS_APP.lock() {
                *prev = Some((pid, name));
            }
        } else {
            qlip_log("show_panel: frontmost is QlipLab itself, keeping previous value");
        }
    }

    if let Ok(panel) = app.get_webview_panel("main") {
        // Re-enable mouse events before showing
        panel.set_ignore_mouse_events(false);
        panel.show();
    } else {
        // Fallback: standard Tauri window API (when macOSPrivateApi is false)
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn show_panel(app: tauri::AppHandle) -> Result<(), String> {
    qlip_log("show_panel [non-mac]: showing window");
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        qlip_log("show_panel [non-mac]: window shown + focused");
    } else {
        qlip_log("show_panel [non-mac]: ERROR — main window not found");
    }
    Ok(())
}

/// Hide panel (macOS)
/// Hide panel (macOS)
/// Falls back to standard window API if NSPanel is unavailable (e.g. macOSPrivateApi: false)
/// With non-activating panel, the previous app remains "active" throughout,
/// so no activation/deactivation dance is needed — just hide the panel.
#[cfg(target_os = "macos")]
#[tauri::command]
fn hide_panel(app: tauri::AppHandle) -> Result<(), String> {
    if let Ok(panel) = app.get_webview_panel("main") {
        // Disable mouse events BEFORE hiding to prevent input capture
        panel.set_ignore_mouse_events(true);
        panel.order_out(None);
    } else {
        // Fallback: standard Tauri window API (when macOSPrivateApi is false)
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn hide_panel(app: tauri::AppHandle) -> Result<(), String> {
    qlip_log("hide_panel [non-mac]: hiding window");
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        qlip_log("hide_panel [non-mac]: window hidden");
    } else {
        qlip_log("hide_panel [non-mac]: ERROR — main window not found");
    }
    Ok(())
}

#[tauri::command]
fn simulate_paste() -> Result<(), String> {
    qlip_log("simulate_paste: CALLED");
    thread::spawn(|| {
        #[cfg(target_os = "macos")]
        {
            // Ensure Accessibility permission is requested on first paste attempt.
            // This triggers the macOS TCC dialog if permission hasn't been granted yet.
            // CGEvent.post uses Accessibility (kTCCServiceAccessibility) — separate from Apple Events.
            let preflight = unsafe { CGPreflightPostEventAccess() };
            qlip_log(&format!("simulate_paste: CGPreflightPostEventAccess={}", preflight));
            if !preflight {
                qlip_log("Accessibility not granted, requesting...");
                unsafe { CGRequestPostEventAccess(); }
                thread::sleep(Duration::from_millis(200));
            }

            let prev_app = PREVIOUS_APP.lock().ok().and_then(|guard| guard.clone());
            qlip_log(&format!("simulate_paste: prev_app={:?}", prev_app));

            // Electron apps need more time to establish focus after activation
            const ELECTRON_APPS: &[&str] = &[
                "Microsoft Teams", "Slack", "Discord",
                "Visual Studio Code", "Code", "Notion", "Figma",
                "Obsidian", "Postman", "Spotify",
            ];

            if let Some((pid, ref name)) = prev_app {
                // Activate the previous app explicitly before posting CGEvent.
                // Even though NSPanel is non-activating, Tauri's appWindow.show()
                // calls makeKeyAndOrderFront which MAY steal activation in some cases.
                // Explicitly activating ensures CGEvent Cmd+V always reaches the right app.
                let activated = cocoa_activate_app(pid);
                qlip_log(&format!("simulate_paste: activating '{}' (pid={}) → {}", name, pid, activated));

                // Wait for activation to take effect + clipboard write to commit
                let delay = if ELECTRON_APPS.iter().any(|e| name.contains(e)) { 150 } else { 80 };
                thread::sleep(Duration::from_millis(delay));

                // Paste via CGEvent (Session tap — Maccy App Store best practice)
                if paste_via_cgevent() {
                    qlip_log(&format!("CGEvent paste succeeded for '{}'", name));
                } else {
                    qlip_log(&format!("CGEvent paste FAILED for '{}'", name));
                }
            } else {
                // No previous app saved — try to paste to current frontmost
                qlip_log("simulate_paste: no previous app, pasting to current frontmost");
                thread::sleep(Duration::from_millis(100));
                paste_via_cgevent();
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            qlip_log("simulate_paste [non-mac]: starting");
            #[cfg(target_os = "windows")]
            {
                use windows::Win32::UI::WindowsAndMessaging::SetForegroundWindow;
                use windows::Win32::Foundation::HWND;
                if let Ok(guard) = PREVIOUS_HWND.lock() {
                    if let Some(hwnd_val) = *guard {
                        qlip_log(&format!("simulate_paste [win]: activating hwnd={}", hwnd_val));
                        unsafe {
                            let _ = SetForegroundWindow(HWND(hwnd_val as *mut std::ffi::c_void));
                        }
                    } else {
                        qlip_log("simulate_paste [win]: no previous hwnd saved");
                    }
                }
            }

            thread::sleep(Duration::from_millis(100));
            if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
                qlip_log("simulate_paste [non-mac]: enigo created, pressing Ctrl+V");
                let _ = enigo.key(Key::Control, Direction::Press);
                thread::sleep(Duration::from_millis(20));
                let _ = enigo.key(Key::Unicode('v'), Direction::Click);
                thread::sleep(Duration::from_millis(20));
                let _ = enigo.key(Key::Control, Direction::Release);
                qlip_log("simulate_paste [non-mac]: Ctrl+V sent");
            } else {
                qlip_log("simulate_paste [non-mac]: ERROR — failed to create Enigo instance");
            }
        }
    });

    Ok(())
}

/// Simulate Cmd+V (or Ctrl+V) in the CURRENT frontmost app — no app switching.
/// Used by snippet auto-expand where the user is already typing in the target app,
/// and by OCR "Extract Text" paste.
#[tauri::command]
fn simulate_paste_in_place() -> Result<(), String> {
    thread::spawn(|| {
        #[cfg(target_os = "macos")]
        {
            // CGEvent with Session tap (Maccy App Store best practice).
            // No AppleScript fallback — CGEvent is the only App Store compliant method.
            if !paste_via_cgevent() {
                qlip_log("simulate_paste_in_place: CGEvent paste FAILED");
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

/// Send N backspace key events to delete the trigger text.
/// Uses CGEvent with Session tap (Maccy App Store best practice).
#[tauri::command]
fn simulate_backspace(count: u32) -> Result<(), String> {
    qlip_log(&format!("simulate_backspace: count={}", count));
    let count = count.min(500); // Cap at reasonable limit
    thread::spawn(move || {
        #[cfg(target_os = "macos")]
        {
            const BACKSPACE_KEY: u16 = 51;
            for _ in 0..count {
                post_key_via_cgevent(BACKSPACE_KEY);
                thread::sleep(Duration::from_millis(10));
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

/// Stop acting on keystrokes. The OS watcher thread stays alive (its run loop
/// cannot be torn down safely), but it ignores every event until re-enabled.
#[tauri::command]
fn stop_trigger_engine(
    state: tauri::State<'_, Arc<Mutex<TriggerEngineState>>>,
) -> Result<(), String> {
    TRIGGER_ENGINE_ENABLED.store(false, Ordering::SeqCst);
    if let Ok(mut s) = state.lock() {
        s.triggers.clear();
    }
    qlip_log("stop_trigger_engine: disabled");
    Ok(())
}

/// Update the trigger map used by the keystroke watcher
#[tauri::command]
fn update_triggers(
    state: tauri::State<'_, Arc<Mutex<TriggerEngineState>>>,
    triggers: Vec<(String, String)>,
) -> Result<(), String> {
    qlip_log(&format!("update_triggers: received {} triggers", triggers.len()));
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
    TRIGGER_ENGINE_ENABLED.store(true, Ordering::SeqCst);
    if TRIGGER_ENGINE_RUNNING.swap(true, Ordering::SeqCst) {
        return Ok(()); // watcher thread already alive; just re-enabled it
    }

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
                        qlip_log(&format!("TriggerEngine: MATCHED '{}' → {}", matched_trigger, matched_id));
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

        // Auto-expand turned off: keep the tap alive but ignore keystrokes.
        if !TRIGGER_ENGINE_ENABLED.load(Ordering::Relaxed) && event_type != CG_EVENT_TAP_DISABLED_BY_TIMEOUT {
            return event;
        }

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

    qlip_log("start_trigger_engine: CALLED");
    let state = Arc::clone(&state);

    thread::spawn(move || {
        qlip_log("TriggerEngine: thread started, creating CGEventTap...");
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
                qlip_log("TriggerEngine: CGEventTapCreate returned NULL — Accessibility not granted?");
                // Allow a later start attempt once the user grants permission.
                TRIGGER_ENGINE_RUNNING.store(false, Ordering::SeqCst);
                return;
            }
            qlip_log("TriggerEngine: CGEventTap created successfully, starting run loop");

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
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<TriggerEngineState>>>,
) -> Result<(), String> {
    TRIGGER_ENGINE_ENABLED.store(true, Ordering::SeqCst);
    if TRIGGER_ENGINE_RUNNING.swap(true, Ordering::SeqCst) {
        return Ok(()); // watcher thread already alive; just re-enabled it
    }

    let state = Arc::clone(&state);

    thread::spawn(move || {
        let mut buffer = String::new();
        const MAX_BUFFER: usize = 100;

        // Pending match for longest-match disambiguation
        struct PendingMatch {
            trigger: String,
            source_id: String,
            trigger_len: usize,
        }
        let mut pending: Option<PendingMatch> = None;

        let callback = move |event: rdev::Event| {
            // Auto-expand turned off: keep the listener alive but ignore keystrokes.
            if !TRIGGER_ENGINE_ENABLED.load(Ordering::Relaxed) {
                return;
            }
            match event.event_type {
                rdev::EventType::KeyPress(key) => {
                    // Check if expanding — skip capture
                    if let Ok(s) = state.lock() {
                        if s.expanding {
                            return;
                        }
                    }

                    // Handle navigation/control keys — clear buffer
                    match key {
                        rdev::Key::Return | rdev::Key::Tab | rdev::Key::Escape |
                        rdev::Key::UpArrow | rdev::Key::DownArrow |
                        rdev::Key::LeftArrow | rdev::Key::RightArrow => {
                            pending = None;
                            buffer.clear();
                            return;
                        }
                        rdev::Key::Backspace => {
                            pending = None;
                            buffer.pop();
                            return;
                        }
                        _ => {}
                    }

                    // Get typed character from event.name
                    if let Some(ref name) = event.name {
                        if name.is_empty() || name.chars().all(|c| c.is_control()) {
                            return;
                        }

                        buffer.push_str(name);
                        if buffer.len() > MAX_BUFFER {
                            let drain = buffer.len() - MAX_BUFFER;
                            buffer.drain(..drain);
                        }

                        if let Ok(s) = state.lock() {
                            // Find longest matching trigger
                            let mut best: Option<(&str, &str, usize)> = None;
                            for (trigger, source_id) in &s.triggers {
                                if buffer.ends_with(trigger.as_str()) {
                                    if best.is_none() || trigger.len() > best.unwrap().2 {
                                        best = Some((trigger, source_id, trigger.len()));
                                    }
                                }
                            }

                            if let Some((matched_trigger, matched_id, matched_len)) = best {
                                // Check if a longer trigger could still match
                                let has_longer = s.triggers.iter().any(|(t, _)| {
                                    t.len() > matched_len && t.starts_with(matched_trigger)
                                });

                                if has_longer {
                                    pending = Some(PendingMatch {
                                        trigger: matched_trigger.to_string(),
                                        source_id: matched_id.to_string(),
                                        trigger_len: matched_len,
                                    });
                                } else {
                                    pending = None;
                                    let _ = app.emit("trigger-matched", serde_json::json!({
                                        "trigger": matched_trigger,
                                        "sourceId": matched_id,
                                        "triggerLen": matched_len
                                    }));
                                    buffer.clear();
                                }
                            } else if pending.is_some() {
                                // Check if pending match should be flushed
                                let p = pending.as_ref().unwrap();
                                let extra = buffer.len().saturating_sub(
                                    buffer.rfind(&p.trigger).map_or(0, |pos| pos + p.trigger.len())
                                );
                                let typed_so_far_len = p.trigger_len + extra;

                                let could_still_match = s.triggers.iter().any(|(t, _)| {
                                    t.len() > p.trigger_len
                                        && t.starts_with(&p.trigger)
                                        && typed_so_far_len <= t.len()
                                        && buffer.ends_with(&t[..typed_so_far_len])
                                });

                                if !could_still_match {
                                    let p = pending.take().unwrap();
                                    let _ = app.emit("trigger-matched", serde_json::json!({
                                        "trigger": p.trigger,
                                        "sourceId": p.source_id,
                                        "triggerLen": p.trigger_len + extra
                                    }));
                                    buffer.clear();
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        };

        if let Err(e) = rdev::listen(callback) {
            eprintln!("[TriggerEngine] rdev listen error: {:?}", e);
        }
    });

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

    let output = match Command::new("swift")
        .arg("-e")
        .arg(swift_script)
        .env("QLIPLAB_OCR_PATH", temp_path.to_string_lossy().as_ref())
        .output()
    {
        Ok(o) => o,
        Err(e) => {
            // Cleanup temp file before returning
            let _ = std::fs::remove_file(&temp_path);
            let err_msg = format!("{}", e);
            eprintln!("[ocr_image] Failed to run swift: {:?}", e);
            if err_msg.contains("Operation not permitted") || err_msg.contains("sandbox") {
                return Err("OCR is not available in sandboxed mode. Please use the development build for OCR.".to_string());
            }
            return Err("Failed to run OCR. The swift command may not be available in this environment.".to_string());
        }
    };

    // Cleanup temp file
    if let Err(e) = std::fs::remove_file(&temp_path) {
        eprintln!("[ocr_image] Failed to cleanup temp file: {:?}", e);
    }

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(text)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        eprintln!("[ocr_image] swift script failed: {}", stderr);
        if stderr.contains("Operation not permitted") || stderr.contains("sandbox") || stderr.contains("deny") {
            Err("OCR is not available in sandboxed mode. Please use the development build for OCR.".to_string())
        } else {
            Err("OCR processing failed".to_string())
        }
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
async fn ocr_image(base64_data: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    // Decode base64 to image bytes
    let image_bytes = STANDARD.decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Write to temp file
    let temp_path = std::env::temp_dir().join(format!("qliplab_ocr_{}.png", std::process::id()));
    std::fs::write(&temp_path, &image_bytes)
        .map_err(|_| "Failed to write temp file".to_string())?;

    // Use PowerShell with Windows.Media.Ocr API (available on Windows 10+)
    let ps_script = r#"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.RandomAccessStream, Windows.Foundation, ContentType = WindowsRuntime]

function Await($WinRtTask) {
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethod('AsTask', @([Windows.Foundation.IAsyncOperation``1].MakeGenericType($WinRtTask.GetType().GetGenericArguments())))
    $task = $asTask.Invoke($null, @($WinRtTask))
    $task.Wait()
    $task.Result
}

$path = $env:QLIPLAB_OCR_PATH
$stream = [System.IO.File]::OpenRead($path)
$randomStream = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($stream)
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($randomStream))
$bitmap = Await ($decoder.GetSoftwareBitmapAsync())
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($engine -eq $null) { Write-Output ""; exit 0 }
$result = Await ($engine.RecognizeAsync($bitmap))
Write-Output $result.Text
$stream.Close()
"#;

    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", ps_script])
        .env("QLIPLAB_OCR_PATH", temp_path.to_string_lossy().as_ref())
        .output()
        .map_err(|_| "Failed to run OCR".to_string())?;

    // Cleanup temp file
    let _ = std::fs::remove_file(&temp_path);

    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(text)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!("OCR failed: {}", err))
    }
}

#[cfg(target_os = "linux")]
#[tauri::command]
async fn ocr_image(_base64_data: String) -> Result<String, String> {
    Err("OCR is not yet available on Linux".to_string())
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
    #[allow(deprecated)]
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

    // Get running (non-background) process names via native NSWorkspace API
    let running_names: HashSet<String> = cocoa_running_apps()
        .into_iter()
        .map(|(name, _pid)| name.to_lowercase())
        .collect();

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
                            let is_running = running_names.contains(&name.to_lowercase());
                            all_apps.push((name, is_running));
                        }
                    }
                }
            }
        }
    }

    // Also add any running apps not found in /Applications
    for running in &running_names {
        if !seen.contains(running) {
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
    if let Ok(program_data) = std::env::var("ProgramData") {
        dirs.push(std::path::PathBuf::from(format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", program_data)));
    }

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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // Second instance tried to launch — show the existing window instead
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));

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
            stop_trigger_engine,
            accessibility_granted,
            request_accessibility_permission,
            open_accessibility_settings,
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

                // macOS: Use template image (black on transparent, system adapts color)
                // Windows/Linux: Use full-color app icon
                #[cfg(target_os = "macos")]
                {
                    let tray_icon_bytes = include_bytes!("../icons/tray-icon.png");
                    if let Ok(icon) = tauri::image::Image::from_bytes(tray_icon_bytes) {
                        tray_builder = tray_builder.icon(icon);
                    } else if let Some(icon) = app.default_window_icon().cloned() {
                        tray_builder = tray_builder.icon(icon);
                    }
                }
                #[cfg(not(target_os = "macos"))]
                {
                    if let Some(icon) = app.default_window_icon().cloned() {
                        tray_builder = tray_builder.icon(icon);
                    }
                }

                let _tray = tray_builder
                    .icon_as_template(cfg!(target_os = "macos"))
                    .menu(&menu)
                    .on_menu_event(|app, event| {
                        match event.id().as_ref() {
                            "show" => {
                                // Emit event to frontend — let JS handle the full
                                // show sequence (show_panel → size → position → focus)
                                let _ = app.emit("tray-show", ());
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        // Click on tray icon → show window (Windows/Linux behavior)
                        if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                            let _ = tray.app_handle().emit("tray-show", ());
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
