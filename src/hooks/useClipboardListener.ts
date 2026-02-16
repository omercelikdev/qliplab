import { useEffect, useRef } from 'react';
import {
  startListening,
  onTextUpdate,
  onImageUpdate,
  hasHTML,
  readHtml,
} from 'tauri-plugin-clipboard-api';
import { invoke } from '@tauri-apps/api/core';
import { useHistoryStore } from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { detectFormat, isSensitive } from '@/lib/formatDetector';

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

          await addItem({
            content: text,
            htmlContent,
            contentType: 'text',
            detectedFormat: detectFormat(text),
            isSensitive: settings.sensitiveDetectionEnabled ? isSensitive(text) : false,
            sourceApp,
          });
        });

        unlistenImage = await onImageUpdate(async (base64Image) => {
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
