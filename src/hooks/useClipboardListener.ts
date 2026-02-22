import { useEffect, useRef } from 'react';
import {
  startListening,
  onTextUpdate,
  onImageUpdate,
  hasHTML,
  readHtml,
} from 'tauri-plugin-clipboard-api';
import { writeText as writeTextNative } from '@tauri-apps/plugin-clipboard-manager';
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
          if (isQueuePasting()) return;
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
          const cmds = settings.autoCommands;
          console.log('[AutoCmd] format:', format, 'cmds:', cmds?.length, cmds);
          if (!cmds || cmds.length === 0) return;

          for (const cmd of cmds) {
            console.log('[AutoCmd] checking:', cmd.format, '===', format, 'enabled:', cmd.enabled);
            if (!cmd.enabled || cmd.format !== format) continue;

            const transform = TRANSFORM_REGISTRY.find((t) => t.id === cmd.transformId);
            console.log('[AutoCmd] transform found:', !!transform, cmd.transformId);
            if (!transform) continue;

            try {
              const result = await transform.apply(text);
              console.log('[AutoCmd] result === text?', result === text, 'result length:', result?.length);
              if (result && result !== text) {
                skipNextClipboardChange = true;
                lastTextRef.current = result;
                await writeTextNative(result);
                console.log('[AutoCmd] clipboard updated successfully');
                return; // Only apply first matching command
              }
            } catch (err) {
              console.error('[AutoCmd] failed:', err);
            }
          }
        });

        unlistenImage = await onImageUpdate(async (base64Image) => {
          if (isQueuePasting()) return;
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
