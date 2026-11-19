import { BrowserWindow, screen } from 'electron';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const detectSession = () => {
  const linux = process.platform === 'linux';
  const type = process.env.XDG_SESSION_TYPE;
  const wayland =
    linux && (type === 'wayland' || (!!process.env.WAYLAND_DISPLAY && type !== 'x11'));
  return { wayland, xwayland: wayland && !!process.env.DISPLAY };
};

const PROBE_PAGE = `data:text/html,${encodeURIComponent(
  '<html><body style="margin:0;background:transparent"></body></html>',
)}`;

/**
 * XWayland only learns where the pointer is when it enters one of its windows.
 * A transparent window over every display for a fraction of a second is enough
 * for the compositor to send that position.
 */
const probeXWayland = async () => {
  const before = screen.getCursorScreenPoint();
  const windows = screen.getAllDisplays().map(
    (display) =>
      new BrowserWindow({
        ...display.bounds,
        type: 'notification',
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        skipTaskbar: true,
        alwaysOnTop: true,
        hasShadow: false,
        resizable: false,
        enableLargerThanScreen: true,
        show: false,
        webPreferences: { sandbox: true },
      }),
  );
  try {
    await Promise.all(windows.map((win) => win.loadURL(PROBE_PAGE)));
    for (const win of windows) {
      win.setAlwaysOnTop(true, 'screen-saver');
      win.showInactive();
    }
    for (let i = 0; i < 10; i++) {
      await sleep(30);
      const point = screen.getCursorScreenPoint();
      if (point.x !== before.x || point.y !== before.y) break;
    }
    await sleep(30);
    return screen.getCursorScreenPoint();
  } finally {
    for (const win of windows) win.destroy();
  }
};

/**
 * mode: direct (X11, Windows, macOS), probe (XWayland) or none (native Wayland).
 */
export const createCursorTracker = (session, ozonePlatform) => {
  const mode = !session.wayland ? 'direct' : ozonePlatform === 'x11' ? 'probe' : 'none';
  return {
    mode,
    canFollow: mode === 'direct',
    locate: async () => {
      if (mode === 'none') return null;
      return mode === 'probe' ? probeXWayland() : screen.getCursorScreenPoint();
    },
    current: () => (mode === 'direct' ? screen.getCursorScreenPoint() : null),
  };
};
