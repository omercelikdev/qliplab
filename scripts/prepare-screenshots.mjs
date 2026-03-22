import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'docs/screenshots');
const OUTPUT_DIR = path.join(SCREENSHOTS_DIR, 'appstore');

// App Store Mac: 2560x1600
const TARGET_W = 2560;
const TARGET_H = 1600;

// Gradient background colors (dark navy to slightly lighter)
const BG_TOP = { r: 11, g: 17, b: 32 };    // #0B1120
const BG_BOTTOM = { r: 22, g: 30, b: 52 };  // #161E34

async function createGradientBackground(width, height) {
  // Create gradient using raw pixel data
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    const ratio = y / height;
    const r = Math.round(BG_TOP.r + (BG_BOTTOM.r - BG_TOP.r) * ratio);
    const g = Math.round(BG_TOP.g + (BG_BOTTOM.g - BG_TOP.g) * ratio);
    const b = Math.round(BG_TOP.b + (BG_BOTTOM.b - BG_TOP.b) * ratio);

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

async function processScreenshot(filename, outputName) {
  const inputPath = path.join(SCREENSHOTS_DIR, filename);
  const outputPath = path.join(OUTPUT_DIR, outputName);

  // Get original image metadata
  const metadata = await sharp(inputPath).metadata();
  console.log(`Processing ${filename}: ${metadata.width}x${metadata.height}`);

  // Calculate scale to fit within target with padding
  const padding = 80; // px padding around the screenshot
  const maxW = TARGET_W - padding * 2;
  const maxH = TARGET_H - padding * 2;

  const scaleW = maxW / metadata.width;
  const scaleH = maxH / metadata.height;
  const scale = Math.min(scaleW, scaleH, 2.0); // Don't upscale more than 2x

  const newW = Math.round(metadata.width * scale);
  const newH = Math.round(metadata.height * scale);

  // Resize the screenshot (high quality)
  const resized = await sharp(inputPath)
    .resize(newW, newH, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false
    })
    .png()
    .toBuffer();

  // Create gradient background
  const bg = await createGradientBackground(TARGET_W, TARGET_H);

  // Calculate center position
  const left = Math.round((TARGET_W - newW) / 2);
  const top = Math.round((TARGET_H - newH) / 2);

  // Composite: screenshot on gradient background
  await sharp(bg)
    .composite([{
      input: resized,
      left,
      top,
    }])
    .png({ quality: 95 })
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`  → ${outputName}: ${TARGET_W}x${TARGET_H} (${Math.round(stats.size/1024)}KB)`);
}

async function main() {
  console.log('Preparing App Store screenshots...\n');

  await processScreenshot('01-clipboard-history.png', '01-clipboard-history.png');
  await processScreenshot('02-json-transform.png', '02-json-transform.png');
  await processScreenshot('03-snippets-list.png', '03-snippets-list.png');
  await processScreenshot('04-vault-locked.png', '04-vault-locked.png');
  await processScreenshot('05-vault-items.png', '05-vault-items.png');
  await processScreenshot('07-snippet-editor.png', '06-snippet-editor.png');

  console.log('\nDone! Screenshots in docs/screenshots/appstore/');
}

main().catch(console.error);
