export const FACE_W = 26;
export const FACE_H = 23;
export const WALKER_H = FACE_H + 4;

export const PALETTE = {
  outline: '#3b2a40',
  skin: '#ffd45e',
  shade: '#f0aa3c',
  light: '#fff3bd',
  white: '#ffffff',
  pupil: '#2a1f3d',
  blush: '#ff9a8f',
  mouth: '#b8325a',
  shoe: '#e0475b',
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const createMask = (w, h, inside) => {
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) cells[y * w + x] = inside(x, y) ? 1 : 0;
  }
  const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cells[y * w + x] === 1;
  const edge = (x, y) =>
    has(x, y) && (!has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1));
  return { w, h, has, edge };
};

const HEAD = createMask(FACE_W, FACE_H, (x, y) => {
  const nx = (x + 0.5 - FACE_W / 2) / (FACE_W / 2);
  const ny = (y + 0.5 - FACE_H / 2) / (FACE_H / 2);
  return Math.abs(nx) ** 2.3 + Math.abs(ny) ** 2.3 <= 1;
});

const EYE = createMask(9, 9, (x, y) => (x - 4) ** 2 + (y - 4) ** 2 <= 4.4 ** 2);
const EYES = [
  { x: 3, y: 5, side: -1 },
  { x: 14, y: 5, side: 1 },
];

const BLUSH = [
  [3, 15],
  [4, 15],
  [21, 15],
  [22, 15],
];

const SQUEEZE = {
  [-1]: [
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
    [6, 4],
    [4, 5],
    [5, 5],
    [2, 6],
    [3, 6],
  ],
  [1]: [
    [5, 2],
    [6, 2],
    [3, 3],
    [4, 3],
    [2, 4],
    [3, 5],
    [4, 5],
    [5, 6],
    [6, 6],
  ],
};

const BROWS = {
  raised: [
    [5, 3],
    [6, 3],
    [7, 3],
    [8, 3],
    [17, 3],
    [18, 3],
    [19, 3],
    [20, 3],
  ],
  tense: [
    [4, 5],
    [5, 5],
    [6, 6],
    [7, 6],
    [18, 6],
    [19, 6],
    [20, 5],
    [21, 5],
  ],
};

const MOUTHS = {
  smile: {
    line: [
      [10, 16],
      [15, 16],
      [11, 17],
      [12, 17],
      [13, 17],
      [14, 17],
    ],
  },
  open: {
    line: [
      [10, 16],
      [11, 16],
      [12, 16],
      [13, 16],
      [14, 16],
      [15, 16],
      [10, 17],
      [15, 17],
      [11, 18],
      [14, 18],
      [12, 19],
      [13, 19],
    ],
    fill: [
      [11, 17],
      [12, 17],
      [13, 17],
      [14, 17],
      [12, 18],
      [13, 18],
    ],
  },
  o: {
    line: [
      [12, 16],
      [13, 16],
      [11, 17],
      [14, 17],
      [12, 18],
      [13, 18],
    ],
    fill: [
      [12, 17],
      [13, 17],
    ],
  },
  flat: {
    line: [
      [11, 17],
      [12, 17],
      [13, 17],
      [14, 17],
    ],
  },
  tense: {
    line: [
      [10, 17],
      [11, 16],
      [12, 17],
      [13, 17],
      [14, 16],
      [15, 17],
    ],
  },
};

const headColor = (x, y) => {
  if (HEAD.edge(x, y)) return PALETTE.outline;
  if (y > FACE_H / 2 && (HEAD.edge(x, y + 1) || (x > FACE_W / 2 && HEAD.edge(x + 1, y)))) {
    return PALETTE.shade;
  }
  if (y < FACE_H / 2 && x < FACE_W / 2 && (HEAD.edge(x, y - 1) || HEAD.edge(x - 1, y))) {
    return PALETTE.light;
  }
  return PALETTE.skin;
};

const drawEye = (put, eye, pose) => {
  const at = (x, y, color) => put(eye.x + x, eye.y + y, color);
  const inner = (x, y) => EYE.has(x, y) && !EYE.edge(x, y);

  if (pose.lids === 'open' || pose.lids === 'half') {
    const lid = pose.lids === 'half' ? 3 : -1;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (!EYE.has(x, y)) continue;
        if (y < lid) at(x, y, PALETTE.skin);
        else if (y === lid || EYE.edge(x, y)) at(x, y, PALETTE.outline);
        else at(x, y, PALETTE.white);
      }
    }
    const dx = Math.round(clamp(pose.lookX, -1, 1) * 2 - eye.side * clamp(pose.cross, 0, 2));
    const dy = Math.round(clamp(pose.lookY, -1, 1) * 2);
    const x0 = 3 + clamp(dx, -2, 2);
    const y0 = 3 + dy;
    for (let y = y0; y < y0 + 3; y++) {
      for (let x = x0; x < x0 + 3; x++) {
        if (inner(x, y) && y > lid) at(x, y, PALETTE.pupil);
      }
    }
    if (inner(x0, y0) && y0 > lid) at(x0, y0, PALETTE.white);
    return;
  }

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) if (EYE.has(x, y)) at(x, y, PALETTE.skin);
  }
  if (pose.lids === 'closed') {
    for (let x = 1; x < 8; x++) at(x, 4, PALETTE.outline);
  } else if (pose.lids === 'relaxed') {
    at(1, 4, PALETTE.outline);
    at(7, 4, PALETTE.outline);
    for (let x = 2; x < 7; x++) at(x, 5, PALETTE.outline);
  } else if (pose.lids === 'squeeze') {
    for (const [x, y] of SQUEEZE[eye.side]) at(x, y, PALETTE.outline);
  }
};

/**
 * Draws the face into any pixel sink: `put(x, y, cssColor)`.
 * Pose: lookX/lookY in [-1, 1], cross in [0, 2] (pupils toward the nose),
 * lids: open | half | closed | relaxed | squeeze, mouth: smile | open | o | flat | tense,
 * brows: none | raised | tense.
 */
export const drawFace = (put, pose = {}, ox = 0, oy = 0) => {
  const p = { lookX: 0, lookY: 0, cross: 0, lids: 'open', mouth: 'smile', brows: 'none', ...pose };
  const px = (x, y, color) => put(x + ox, y + oy, color);

  for (let y = 0; y < FACE_H; y++) {
    for (let x = 0; x < FACE_W; x++) if (HEAD.has(x, y)) px(x, y, headColor(x, y));
  }
  for (const [x, y] of BLUSH) px(x, y, PALETTE.blush);
  for (const eye of EYES) drawEye(px, eye, p);
  for (const [x, y] of BROWS[p.brows] ?? []) px(x, y, PALETTE.outline);

  const mouth = MOUTHS[p.mouth] ?? MOUTHS.smile;
  for (const [x, y] of mouth.fill ?? []) px(x, y, PALETTE.mouth);
  for (const [x, y] of mouth.line) px(x, y, PALETTE.outline);
};

const drawShoe = (put, x0, y0) => {
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 5; x++) {
      const corner = (y === 0 || y === 2) && (x === 0 || x === 4);
      if (corner) continue;
      const edge = y === 0 || y === 2 || x === 0 || x === 4;
      put(x0 + x, y0 + y, edge ? PALETTE.outline : PALETTE.shoe);
    }
  }
};

/** The face stepping in place: shoes alternate, head bobs on each step. */
export const drawWalker = (put, t, pose = {}) => {
  const step = Math.floor(t / 0.32) % 2;
  drawFace(put, pose, 0, step);
  drawShoe(put, 5, step === 0 ? FACE_H : FACE_H + 1);
  drawShoe(put, 16, step === 0 ? FACE_H + 1 : FACE_H);
};

const TRAY_MAP = [
  '.....######.....',
  '...##oooooo##...',
  '..#oooooooooo#..',
  '.#oooooooooooo#.',
  '.#oooooooooooo#.',
  '#oooEEooooEEooo#',
  '#ooEwpEooEwpEoo#',
  '#ooEppEooEppEoo#',
  '#oooEEooooEEooo#',
  '#oooooooooooooo#',
  '#bboo#oooo#oobb#',
  '.#oooo####oooo#.',
  '.#oooooooooooo#.',
  '..#oooooooooo#..',
  '...##oooooo##...',
  '.....######.....',
];

const TRAY_SLEEP = TRAY_MAP.map((row, y) => {
  if (y === 5 || y === 6 || y === 8) return '#oooooooooooooo#';
  if (y === 7) return '#ooEEEEooEEEEoo#';
  return row;
});

const TRAY_COLORS = {
  '#': PALETTE.outline,
  o: PALETTE.skin,
  E: PALETTE.outline,
  w: PALETTE.white,
  p: PALETTE.pupil,
  b: PALETTE.blush,
};

export const TRAY_SIZE = 16;

/** 16×16 tray glyph; `mono` draws a silhouette for macOS template images. */
export const drawTrayIcon = (put, { sleeping = false, mono = false } = {}) => {
  const map = sleeping ? TRAY_SLEEP : TRAY_MAP;
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      if (mono) {
        if (ch === 'w' || ch === 'o' || ch === 'b') return;
        put(x, y, '#000000');
        return;
      }
      put(x, y, TRAY_COLORS[ch]);
    });
  });
};
