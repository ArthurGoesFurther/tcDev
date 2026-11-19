import { nativeImage } from 'electron';
import { TRAY_SIZE, drawFace, drawTrayIcon } from '../shared/sprite.js';
import { createRaster, encodePng } from './raster.js';

const trayImage = (options) => {
  const image = nativeImage.createEmpty();
  for (const scaleFactor of [1, 2, 3]) {
    const raster = createRaster(TRAY_SIZE, TRAY_SIZE, { scale: scaleFactor });
    drawTrayIcon(raster.put, options);
    image.addRepresentation({ scaleFactor, buffer: encodePng(raster) });
  }
  if (options.mono) image.setTemplateImage(true);
  return image;
};

/** macOS wants monochrome template images in the menu bar. */
export const createTrayIcons = () => {
  const mono = process.platform === 'darwin';
  return { normal: trayImage({ mono }), sleeping: trayImage({ mono, sleeping: true }) };
};

export const createAppIcon = () => {
  const raster = createRaster(32, 32, { scale: 8 });
  drawFace(raster.put, {}, 3, 5);
  return nativeImage.createFromBuffer(encodePng(raster));
};
