import { useEffect } from 'react';
import { enable, isEnabled } from '@tauri-apps/plugin-autostart';

export function useAutostart() {
  useEffect(() => {
    const setupAutostart = async () => {
      try {
        const enabled = await isEnabled();
        if (!enabled) {
          await enable();
          console.log('Autostart enabled');
        }
      } catch (error) {
        console.error('Failed to setup autostart:', error);
      }
    };

    setupAutostart();
  }, []);
}
