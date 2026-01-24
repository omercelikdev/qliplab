// Cache for parsed image data to avoid re-parsing
const imageCache = new Map<string, { dataUrl: string; base64: string } | null>();

// Parse image data and create a displayable URL (with caching)
export function parseImageData(content: string): { dataUrl: string; base64: string } | null {
  // Check cache first
  if (imageCache.has(content)) {
    return imageCache.get(content) || null;
  }

  try {
    const data = JSON.parse(content);

    // New format: PNG base64 from CrossCopy plugin
    if (data.type === 'png_base64' && data.data) {
      const result = {
        dataUrl: `data:image/png;base64,${data.data}`,
        base64: data.data
      };
      imageCache.set(content, result);
      return result;
    }

    // Legacy format: RGBA data - convert to PNG
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
      if (!ctx) {
        imageCache.set(content, null);
        return null;
      }

      const imageData = ctx.createImageData(data.width, data.height);
      imageData.data.set(rgba);
      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];

      const result = { dataUrl, base64 };
      imageCache.set(content, result);
      return result;
    }
  } catch {
    // Not a valid image data
  }

  imageCache.set(content, null);
  return null;
}

// Get base64 for clipboard write (uses cache)
export function getImageBase64ForClipboard(content: string): string | null {
  const parsed = parseImageData(content);
  return parsed?.base64 || null;
}
