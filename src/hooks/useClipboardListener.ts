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

// Flag to prevent auto-command from re-triggering the listener
let skipNextClipboardChange = false;

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
          if (isQueuePasting()) return; // Skip clipboard changes during queue paste
          if (skipNextClipboardChange) {
            skipNextClipboardChange = false;
            lastTextRef.current = text;
            return;
          }
          if (text === lastTextRef.current) return;
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

          await addItem({
            content: text,
            htmlContent,
            contentType: 'text',
            detectedFormat: format,
            isSensitive: settings.sensitiveDetectionEnabled ? isSensitive(text) : false,
            sourceApp,
          });

          // Auto-commands: apply matching transform and update clipboard
          if (settings.autoCommands && settings.autoCommands.length > 0) {
            const matchingCmd = settings.autoCommands.find(
              (cmd) => cmd.enabled && cmd.format === format
            );
            if (matchingCmd) {
              const transform = TRANSFORM_REGISTRY.find((t) => t.id === matchingCmd.transformId);
              if (transform) {
                try {
                  const result = await transform.apply(text);
                  if (result && result !== text) {
                    skipNextClipboardChange = true;
                    lastTextRef.current = result;
                    try {
                      await writeTextClipboard(result);
                    } catch (writeErr) {
                      console.error('[AutoCommand] Clipboard write failed:', writeErr);
                      skipNextClipboardChange = false;
                    }
                  }
                } catch (err) {
                  console.error('[AutoCommand] Transform failed:', err);
                }
              }
            }
          }
        });

        unlistenImage = await onImageUpdate(async (base64Image) => {
          if (isQueuePasting()) return; // Skip clipboard changes during queue paste
          const settings = useSettingsStore.getState().settings;

          // Respect storeImages setting
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
