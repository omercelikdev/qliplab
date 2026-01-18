import { useEffect } from 'react';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { toggleWindow } from '@/lib/window';

export function useGlobalShortcut() {
  useEffect(() => {
    const setupShortcut = async () => {
      try {
        // Cmd+Shift+V on Mac, Ctrl+Shift+V on Windows/Linux
        await register('CommandOrControl+Shift+V', async (event) => {
          if (event.state === 'Pressed') {
            await toggleWindow();
          }
        });
      } catch (error) {
        console.error('Failed to register global shortcut:', error);
      }
    };

    setupShortcut();

    return () => {
      unregister('CommandOrControl+Shift+V').catch(console.error);
    };
  }, []);
}
