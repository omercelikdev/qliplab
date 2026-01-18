import { useEffect, useRef } from 'react';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { useHistoryStore } from '@/stores/historyStore';
import { detectFormat, isSensitive } from '@/lib/formatDetector';

export function useClipboardListener() {
  const lastContentRef = useRef<string>('');
  const { addItem } = useHistoryStore();

  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const content = await readText();
        if (content && content !== lastContentRef.current) {
          lastContentRef.current = content;
          await addItem({
            content,
            contentType: 'text',
            detectedFormat: detectFormat(content),
            isSensitive: isSensitive(content),
          });
        }
      } catch (error) {
        console.error('Clipboard read error:', error);
      }
    };

    const interval = setInterval(checkClipboard, 500);
    return () => clearInterval(interval);
  }, [addItem]);
}
