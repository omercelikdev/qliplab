import { useEffect, useRef } from 'react';
import {
  startListening,
  onTextUpdate,
  onImageUpdate,
  hasHTML,
  readHtml,
  writeText as writeTextClipboard,
} from 'tauri-plugin-clipboard-api';
import { invoke } from '@tauri-apps/api/core';
import { useHistoryStore } from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { detectFormat, isSensitive } from '@/lib/formatDetector';
import { isQueuePasting } from '@/lib/window';
import { TRANSFORM_REGISTRY } from '@/lib/transformRegistry';
import { getDatabase } from '@/lib/database';

// Flag to prevent auto-command from re-triggering the listener
let skipNextClipboardChange = false;

// Max content size to store (5MB) — prevents app freeze on huge clipboard data
const MAX_CONTENT_SIZE = 5 * 1024 * 1024;

export function useClipboardListener() {
  const { addItem } = useHistoryStore();
  const lastTextRef = useRef<string>('');
  const lastImageHashRef = useRef<string>('');

  useEffect(() => {
    let unlistenText: (() => void) | undefined;
    let unlistenImage: (() => void) | undefined;
    let stopListening: (() => Promise<void>) | undefined;

    const setup = async () => {
      try {
        stopListening = await startListening();

        unlistenText = await onTextUpdate(async (text) => {
          if (isQueuePasting()) return;
          if (skipNextClipboardChange) {
            skipNextClipboardChange = false;
            lastTextRef.current = text;
            return;
          }
          if (!text || text.trim().length === 0) return;
          if (text === lastTextRef.current) return;
          if (text.length > MAX_CONTENT_SIZE) return;
          lastTextRef.current = text;
          lastImageHashRef.current = '';

          const settings = useSettingsStore.getState().settings;

          // Get source app and check ignore list
          let sourceApp: string | undefined;
          try {
            sourceApp = await invoke<string>('get_frontmost_app');
            if (sourceApp && settings.ignoredApps.some(
              (app) => sourceApp!.toLowerCase().includes(app.toLowerCase())
            )) {
              return;
            }
          } catch {
            // Ignore errors getting frontmost app
          }

          // Check if HTML content is also available (rich text copy)
          let htmlContent: string | undefined;
          try {
            if (await hasHTML()) {
              const html = await readHtml();
              if (html && html.trim().length > 0) {
                htmlContent = html;
              }
            }
          } catch {
            // Ignore errors reading HTML
          }

          const format = detectFormat(text);

          const itemId = await addItem({
            content: text,
            htmlContent,
            contentType: 'text',
            detectedFormat: format,
            isSensitive: settings.sensitiveDetectionEnabled ? isSensitive(text) : false,
            sourceApp,
          });

          // Auto-commands: apply matching transform and update clipboard + DB
          const cmds = settings.autoCommands;
          if (!cmds || cmds.length === 0) return;

          for (const cmd of cmds) {
            if (!cmd.enabled || cmd.format !== format) continue;

            const transform = TRANSFORM_REGISTRY.find((t) => t.id === cmd.transformId);
            if (!transform) continue;

            try {
              const result = await transform.apply(text);
              if (result && result !== text) {
                // Update clipboard with safety timeout for skip flag
                skipNextClipboardChange = true;
                setTimeout(() => { skipNextClipboardChange = false; }, 2000);
                lastTextRef.current = result;
                await writeTextClipboard(result);

                // Update stored item by ID so future pastes from qliplab use transformed content
                if (itemId) {
                  try {
                    const db = getDatabase();
                    const newFormat = detectFormat(result);
                    await db.execute(
                      'UPDATE clipboard_history SET content = ?, detected_format = ?, updated_at = ? WHERE id = ?',
                      [result, newFormat, new Date().toISOString(), itemId]
                    );
                    // Reload the list to reflect updated content
                    const { loadItems } = useHistoryStore.getState();
                    await loadItems();
                  } catch {
                    // DB update failed, clipboard still updated
                  }
                }

                return; // Only apply first matching command
              }
            } catch {
              // Transform failed, continue to next
            }
          }
        });

        unlistenImage = await onImageUpdate(async (base64Image) => {
          if (isQueuePasting()) return;
          if (base64Image.length > MAX_CONTENT_SIZE) return;
          const settings = useSettingsStore.getState().settings;

          if (!settings.storeImages) return;

          // Check ignore list
          try {
            const sourceApp = await invoke<string>('get_frontmost_app');
            if (sourceApp && settings.ignoredApps.some(
              (app) => sourceApp.toLowerCase().includes(app.toLowerCase())
            )) {
              return;
            }
          } catch {
            // Ignore errors getting frontmost app
          }

          const imageHash = `img_${base64Image.slice(0, 100)}_${base64Image.length}`;
          if (imageHash === lastImageHashRef.current) return;
          lastImageHashRef.current = imageHash;
          lastTextRef.current = '';

          const imageData = JSON.stringify({
            type: 'png_base64',
            data: base64Image,
          });

          await addItem({
            content: imageData,
            contentType: 'image',
            detectedFormat: 'plain',
            isSensitive: false,
          });
        });
      } catch (error) {
        console.error('[Clipboard] Failed to start listener:', error);
      }
    };

    setup();

    return () => {
      unlistenText?.();
      unlistenImage?.();
      stopListening?.();
    };
  }, [addItem]);
}
