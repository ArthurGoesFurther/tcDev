import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRaster, encodePng } from '../src/main/raster.js';
import { FACE_H, FACE_W, TRAY_SIZE, drawFace, drawTrayIcon } from '../src/shared/sprite.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GRID = 32;

const drawTile = (put) => {
  const radius = GRID / 2 - 1;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const nx = (x + 0.5 - GRID / 2) / radius;
      const ny = (y + 0.5 - GRID / 2) / radius;
      if (Math.abs(nx) ** 5 + Math.abs(ny) ** 5 > 1) continue;
      put(x, y, y < 11 ? '#8f83fa' : y < 23 ? '#7b6cf6' : '#6a5ae6');
    }
  }
  drawFace(put, {}, (GRID - FACE_W) / 2, Math.ceil((GRID - FACE_H) / 2));
};

const write = (file, raster) => {
  const out = path.join(root, 'build', file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, encodePng(raster));
  console.log(`wrote build/${file}`);
};

const tile = (scale) => {
  const raster = createRaster(GRID, GRID, { scale });
  drawTile(raster.put);
  return raster;
};

write('icon.png', tile(32));

// Linux icon theme sizes: integer multiples keep the pixel art crisp.
const glyph = createRaster(TRAY_SIZE, TRAY_SIZE);
drawTrayIcon(glyph.put);
write('icons/16x16.png', glyph);
for (const scale of [1, 2, 4, 8, 16, 32]) {
  write(`icons/${GRID * scale}x${GRID * scale}.png`, tile(scale));
}
