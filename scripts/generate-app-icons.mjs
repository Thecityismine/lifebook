// Generates the PWA / iOS home-screen icons in public/ from docs/app_logo.png.
//
// Rules the output has to satisfy:
// - built from a single 1024x1024 master so every size shares the same framing
// - full bleed: the artwork's own background reaches all four edges, no padding ring
// - fully opaque: encoded as PNG colour type 2 (RGB), so there is no alpha channel at all
// - the mark is inset slightly so the iOS squircle mask never clips it
//
// Run with: node scripts/generate-app-icons.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact');

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(projectRoot, 'docs', 'app_logo.png');
const outputDir = path.join(projectRoot, 'public');

const MASTER = 1024;
// The mark already sits ~4.8% from the edges. Inset it a little further so it
// clears the iOS rounded-corner mask with room to spare. The band this frees up
// around the artwork is filled by replicating the artwork's own edge pixels, so
// the dark background continues smoothly out to the canvas edge with no seam.
const ARTWORK_SCALE = 0.94;

const exports_ = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function main() {
  const logo = await Jimp.read(source);

  const artworkSize = Math.round(MASTER * ARTWORK_SCALE);
  const artwork = logo.clone().resize(artworkSize, artworkSize, Jimp.RESIZE_BICUBIC);
  const offset = Math.round((MASTER - artworkSize) / 2);

  // Paint the master by sampling the artwork with clamped coordinates: inside the
  // inset rect that is the artwork itself, outside it the nearest edge pixel. The
  // result bleeds to all four edges with no border, ring, or transparency.
  const master = new Jimp(MASTER, MASTER, 0x000000ff);
  const clamp = (value) => Math.min(artworkSize - 1, Math.max(0, value));

  master.scan(0, 0, MASTER, MASTER, function (x, y, index) {
    const source = artwork.bitmap.data;
    const sourceIndex =
      (clamp(y - offset) * artworkSize + clamp(x - offset)) * 4;
    this.bitmap.data[index] = source[sourceIndex];
    this.bitmap.data[index + 1] = source[sourceIndex + 1];
    this.bitmap.data[index + 2] = source[sourceIndex + 2];
    this.bitmap.data[index + 3] = 255;
  });

  await mkdir(outputDir, { recursive: true });

  for (const { name, size } of exports_) {
    const icon = master.clone().resize(size, size, Jimp.RESIZE_BICUBIC);

    // Belt and braces: force every pixel opaque, then drop the alpha channel
    // entirely by encoding as PNG colour type 2 (RGB).
    icon.opaque();
    icon.colorType(2);

    const buffer = await icon.getBufferAsync(Jimp.MIME_PNG);
    await writeFile(path.join(outputDir, name), buffer);
    console.log(`wrote public/${name} (${size}x${size})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
