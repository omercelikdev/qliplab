import { useEffect, useRef } from 'react';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { useSettingsStore } from '@/stores/settingsStore';
import { toggleWindow } from '@/lib/window';

export function useGlobalShortcut() {
  const globalShortcut = useSettingsStore((s) => s.settings.globalShortcut);
  const isLoading = useSettingsStore((s) => s.isLoading);
  const currentShortcut = useRef<string | null>(null);

  useEffect(() => {
    // Don't register until settings are loaded
    if (isLoading) return;

    const setupShortcut = async () => {
      // Unregister previous shortcut if it exists
      if (currentShortcut.current) {
        try {
          await unregister(currentShortcut.current);
        } catch {
          // Might not be registered
        }
        currentShortcut.current = null;
      }

      // Register new shortcut
      if (!globalShortcut) return;

      try {
        await register(globalShortcut, async (event) => {
          if (event.state === 'Pressed') {
            await toggleWindow();
          }
        });
        currentShortcut.current = globalShortcut;
      } catch (e) {
        console.error(`[qliplab] Failed to register shortcut "${globalShortcut}":`, e);
      }
    };

    setupShortcut();

    return () => {
      if (currentShortcut.current) {
        unregister(currentShortcut.current).catch(() => {});
        currentShortcut.current = null;
      }
    };
  }, [globalShortcut, isLoading]);
}
