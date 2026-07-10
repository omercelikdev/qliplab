import { useEffect, useRef } from 'react';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { useSettingsStore } from '@/stores/settingsStore';
import { toggleWindow } from '@/lib/window';

export function useGlobalShortcut() {
  const globalShortcut = useSettingsStore((s) => s.settings.globalShortcut);
  const globalShortcut2 = useSettingsStore((s) => s.settings.globalShortcut2);
  const isLoading = useSettingsStore((s) => s.isLoading);
  // Shortcuts currently registered, so we can release exactly those on change.
  const registered = useRef<string[]>([]);

  useEffect(() => {
    // Don't register until settings are loaded
    if (isLoading) return;

    const setupShortcuts = async () => {
      // Release whatever we registered last time
      for (const shortcut of registered.current) {
        try {
          await unregister(shortcut);
        } catch {
          // Might not be registered
        }
      }
      registered.current = [];

      // Both slots toggle the window; skip empties and de-dupe so the same combo
      // in both slots doesn't double-register (which would error).
      const wanted = [globalShortcut, globalShortcut2]
        .map((s) => s?.trim())
        .filter((s): s is string => !!s);
      const unique = Array.from(new Set(wanted));

      for (const shortcut of unique) {
        try {
          await register(shortcut, async (event) => {
            if (event.state === 'Pressed') {
              await toggleWindow();
            }
          });
          registered.current.push(shortcut);
        } catch (e) {
          // One bad shortcut must not stop the other from registering.
          console.error(`[qliplab] Failed to register shortcut "${shortcut}":`, e);
        }
      }
    };

    setupShortcuts();

    return () => {
      for (const shortcut of registered.current) {
        unregister(shortcut).catch(() => {});
      }
      registered.current = [];
    };
  }, [globalShortcut, globalShortcut2, isLoading]);
}
