import { useEffect, useRef } from 'react';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { useSettingsStore } from '@/stores/settingsStore';
import { toggleWindow } from '@/lib/window';

export function useGlobalShortcut() {
  const globalShortcut = useSettingsStore((s) => s.settings.globalShortcut);
  const currentShortcut = useRef<string | null>(null);

  useEffect(() => {
    const setupShortcut = async () => {
      // Unregister previous shortcut if changed
      if (currentShortcut.current && currentShortcut.current !== globalShortcut) {
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
      } catch (error) {
        console.error('Failed to register global shortcut:', error);
      }
    };

    setupShortcut();

    return () => {
      if (currentShortcut.current) {
        unregister(currentShortcut.current).catch(() => {});
        currentShortcut.current = null;
      }
    };
  }, [globalShortcut]);
}
