import { useEffect } from 'react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useSettingsStore } from '@/stores/settingsStore';

export function useAutostart() {
  const launchOnLogin = useSettingsStore((s) => s.settings.launchOnLogin);

  useEffect(() => {
    const sync = async () => {
      try {
        const currentlyEnabled = await isEnabled();
        if (launchOnLogin && !currentlyEnabled) {
          await enable();
        } else if (!launchOnLogin && currentlyEnabled) {
          await disable();
        }
      } catch {
        // Autostart not available on this platform
      }
    };
    sync();
  }, [launchOnLogin]);
}
