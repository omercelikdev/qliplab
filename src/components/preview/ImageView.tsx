import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreviewStore } from '@/stores/previewStore';

// Parse image data and create a displayable URL
function parseImageContent(content: string): { dataUrl: string; width?: number; height?: number } | null {
  try {
    const data = JSON.parse(content);

    // New format: PNG base64 from CrossCopy plugin
    if (data.type === 'png_base64' && data.data) {
      return {
        dataUrl: `data:image/png;base64,${data.data}`,
      };
    }

    // Legacy format: RGBA data
    if (data.type === 'rgba' && data.data && data.width && data.height) {
      const binary = atob(data.data);
      const rgba = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        rgba[i] = binary.charCodeAt(i);
      }

      const canvas = document.createElement('canvas');
      canvas.width = data.width;
      canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const imageData = ctx.createImageData(data.width, data.height);
      imageData.data.set(rgba);
      ctx.putImageData(imageData, 0, 0);

      return {
        dataUrl: canvas.toDataURL('image/png'),
        width: data.width,
        height: data.height,
      };
    }
  } catch {
    // Not a valid image data
  }
  return null;
}

export function ImageView() {
  const { t } = useTranslation();
  const { sourceItem } = usePreviewStore();

  const imageData = useMemo(() => {
    if (sourceItem?.contentType === 'image') {
      return parseImageContent(sourceItem.content);
    }
    return null;
  }, [sourceItem]);

  if (!imageData) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        {t('preview.unableToLoadImage')}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 overflow-auto bg-surface/20">
      <img
        src={imageData.dataUrl}
        alt="Clipboard image"
        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
        style={{ imageRendering: 'auto' }}
      />
      {imageData.width && imageData.height && (
        <div className="mt-3 text-xs text-muted-foreground">
          {t('preview.imagePixels', { width: imageData.width, height: imageData.height })}
        </div>
      )}
    </div>
  );
}
