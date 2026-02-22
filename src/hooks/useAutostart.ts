import { useEffect } from 'react';
import { enable, isEnabled } from '@tauri-apps/plugin-autostart';

export function useAutostart() {
  useEffect(() => {
    const setupAutostart = async () => {
      try {
        const enabled = await isEnabled();
        if (!enabled) {
          await enable();
          // Autostart enabled successfully
        }
      } catch {
        // Autostart setup failed
      }
    };

    setupAutostart();
  }, []);
}
