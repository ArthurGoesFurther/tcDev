import { BrowserWindow, ipcMain, screen } from 'electron';
import { FACE_H, FACE_W } from '../shared/sprite.js';

const PAD = 10;
const GAP = 12;
const BUBBLE_W = 236;
const BUBBLE_H = 124;
const MINI_BAR_H = 14;
const CURSOR_GAP = 22;
const EDGE = 24;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const faceWindowSize = ({ faceScale, showHint }) => {
  const faceH = FACE_H * faceScale + faceScale + (showHint ? 0 : MINI_BAR_H);
  return {
    width: PAD * 2 + FACE_W * faceScale + (showHint ? GAP + BUBBLE_W : 0),
    height: PAD * 2 + Math.max(faceH, showHint ? BUBBLE_H : 0),
  };
};

/** Diagonally below-right of the pointer, mirrored when that would leave the screen. */
const nearCursor = (point, size, area, fixedSide) => {
  const side =
    fixedSide ?? (point.x + CURSOR_GAP - PAD + size.width > area.x + area.width ? 'left' : 'right');
  const x = side === 'right' ? point.x + CURSOR_GAP - PAD : point.x - CURSOR_GAP + PAD - size.width;
  const below = point.y + CURSOR_GAP - PAD;
  const y =
    below + size.height > area.y + area.height ? point.y - CURSOR_GAP + PAD - size.height : below;
  return {
    x: clamp(Math.round(x), area.x, area.x + area.width - size.width),
    y: clamp(Math.round(y), area.y, area.y + area.height - size.height),
    side,
  };
};

const placeAt = (position, point, size) => {
  const area = screen.getDisplayNearestPoint(point).workArea;
  if (position === 'cursor') return nearCursor(point, size, area);
  const right = area.x + area.width - size.width - EDGE;
  const bottom = area.y + area.height - size.height - EDGE;
  const spots = {
    'top-left': [area.x + EDGE, area.y + EDGE, 'right'],
    'top-right': [right, area.y + EDGE, 'left'],
    'bottom-left': [area.x + EDGE, bottom, 'right'],
    'bottom-right': [right, bottom, 'left'],
    center: [
      area.x + (area.width - size.width) / 2,
      area.y + (area.height - size.height) / 2,
      'right',
    ],
  };
  const [x, y, side] = spots[position] ?? spots['bottom-right'];
  return { x: Math.round(x), y: Math.round(y), side };
};

/**
 * On X11, Electron drops always-on-top for non-focusable windows, so Linux keeps the window
 * focusable and relies on showInactive() plus the notification type instead.
 */
export const OVERLAY_WINDOW =
  process.platform === 'linux'
    ? { type: 'notification', focusable: true }
    : { type: process.platform === 'darwin' ? 'panel' : 'toolbar', focusable: false };

export const createFacePresenter = ({ preload, page, cursor }) => {
  let current = null;

  ipcMain.on('face:done', (event) => {
    if (current?.win.webContents === event.sender) current.finish(true);
  });

  const follow = (win, size, side) => {
    let [x, y] = win.getPosition();
    return setInterval(() => {
      const point = cursor.current();
      if (!point || win.isDestroyed()) return;
      const target = nearCursor(point, size, screen.getDisplayNearestPoint(point).workArea, side);
      const approach = (from, to) =>
        Math.abs(to - from) <= 1 ? to : Math.round(from + (to - from) * 0.35);
      const nx = approach(x, target.x);
      const ny = approach(y, target.y);
      if (nx === x && ny === y) return;
      [x, y] = [nx, ny];
      win.setPosition(x, y);
    }, 33);
  };

  /** Resolves once the face is gone: true if the exercise ran to the end. */
  const show = async ({ exercise, eyes, lang }) => {
    if (current) return false;
    const size = faceWindowSize(eyes);
    const pointer = eyes.position === 'cursor' ? await cursor.locate() : null;
    const position = eyes.position === 'cursor' && !pointer ? 'bottom-right' : eyes.position;
    const spot = placeAt(position, pointer ?? screen.getCursorScreenPoint(), size);
    console.log(
      `[razminka] eyes: ${exercise} at ${spot.x},${spot.y} (${position}, pointer ${pointer ? `${pointer.x},${pointer.y}` : 'unknown'})`,
    );

    const win = new BrowserWindow({
      x: spot.x,
      y: spot.y,
      ...size,
      ...OVERLAY_WINDOW,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      show: false,
      webPreferences: { preload, sandbox: true, backgroundThrottling: false },
    });
    win.setIgnoreMouseEvents(true);
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });

    let followTimer = null;
    let safetyTimer = null;
    let finished = false;
    let resolveDone;
    const done = new Promise((resolve) => (resolveDone = resolve));
    const finish = (completed = false) => {
      if (finished) return;
      finished = true;
      clearInterval(followTimer);
      clearTimeout(safetyTimer);
      if (!win.isDestroyed()) win.destroy();
      if (current?.win === win) current = null;
      resolveDone(completed);
    };
    current = { win, finish };
    win.on('closed', () => finish());

    try {
      await win.loadFile(page);
    } catch (error) {
      finish();
      throw error;
    }
    if (win.isDestroyed()) return done;

    safetyTimer = setTimeout(() => finish(), (eyes.durationSec + 5) * 1000);
    win.webContents.send('face:start', {
      exercise,
      durationSec: eyes.durationSec,
      scale: eyes.faceScale,
      showHint: eyes.showHint,
      sound: eyes.sound,
      side: spot.side,
      lang,
    });
    win.showInactive();
    if (eyes.followCursor && cursor.canFollow && position === 'cursor') {
      followTimer = follow(win, size, spot.side);
    }
    return done;
  };

  return {
    show,
    cancel: () => current?.finish(),
  };
};
