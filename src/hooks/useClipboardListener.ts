import { useEffect, useRef } from 'react';
import {
  startListening,
  onTextUpdate,
  onImageUpdate,
} from 'tauri-plugin-clipboard-api';
import { useHistoryStore } from '@/stores/historyStore';
import { detectFormat, isSensitive } from '@/lib/formatDetector';

export function useClipboardListener() {
  const { addItem } = useHistoryStore();
  const lastTextRef = useRef<string>('');
  const lastImageHashRef = useRef<string>('');

  useEffect(() => {
    console.log('[Clipboard] Starting event-based listener');

    let unlistenText: (() => void) | undefined;
    let unlistenImage: (() => void) | undefined;
    let stopListening: (() => Promise<void>) | undefined;

    const setup = async () => {
      try {
        // Start native clipboard monitor (event-based on Windows, optimized polling on macOS)
        stopListening = await startListening();
        console.log('[Clipboard] Native monitor started');

        // Listen for text changes - only fires when clipboard actually changes
        unlistenText = await onTextUpdate(async (text) => {
          // Skip if same as last text (safety check)
          if (text === lastTextRef.current) return;
          lastTextRef.current = text;
          lastImageHashRef.current = '';

          console.log('[Clipboard] Text changed, length:', text.length);

          await addItem({
            content: text,
            contentType: 'text',
            detectedFormat: detectFormat(text),
            isSensitive: isSensitive(text),
          });
        });

        // Listen for image changes - receives base64 directly
        unlistenImage = await onImageUpdate(async (base64Image) => {
          // Simple hash for dedup (first 100 chars + length)
          const imageHash = `img_${base64Image.slice(0, 100)}_${base64Image.length}`;
          if (imageHash === lastImageHashRef.current) return;
          lastImageHashRef.current = imageHash;
          lastTextRef.current = '';

          console.log('[Clipboard] Image changed, size:', base64Image.length);

          // Store as PNG base64 (CrossCopy plugin returns PNG)
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

        console.log('[Clipboard] Event listeners registered');
      } catch (error) {
        console.error('[Clipboard] Failed to start listener:', error);
      }
    };

    setup();

    // Cleanup on unmount
    return () => {
      console.log('[Clipboard] Cleaning up listeners');
      unlistenText?.();
      unlistenImage?.();
      stopListening?.();
    };
  }, [addItem]);
}
