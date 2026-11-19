import zlib from 'node:zlib';

const parseColor = (color) => {
  const hex = color.replace('#', '');
  const n = parseInt(hex.length === 6 ? `${hex}ff` : hex, 16);
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
};

/** RGBA canvas where every sprite pixel becomes a `scale`×`scale` block. */
export const createRaster = (width, height, { scale = 1, background = null } = {}) => {
  const w = width * scale;
  const h = height * scale;
  const data = Buffer.alloc(w * h * 4);
  if (background) {
    const [r, g, b, a] = parseColor(background);
    for (let i = 0; i < data.length; i += 4) data.set([r, g, b, a], i);
  }
  const put = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const rgba = parseColor(color);
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++)
        data.set(rgba, ((y * scale + dy) * w + x * scale + dx) * 4);
    }
  };
  return { width: w, height: h, data, put };
};

const crcChunk = (type, body) => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(typed));
  return Buffer.concat([head, typed, crc]);
};

export const encodePng = ({ width, height, data }) => {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++)
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    crcChunk('IHDR', ihdr),
    crcChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    crcChunk('IEND', Buffer.alloc(0)),
  ]);
};
