import { BrowserWindow, ipcMain, screen } from 'electron';

const CARD = { width: 480, height: 560 };
/** Below this many seconds of idle time the user counts as sitting at the computer. */
const ACTIVE_IDLE_SEC = 1.5;

export const createBreakController = ({ preload, page, idle, onFinish }) => {
  let session = null;

  const view = (s) => ({
    phase: s.phase,
    total: s.total,
    remaining: s.remaining,
    waiting: s.waiting,
    requireIdle: s.requireIdle,
    strict: s.strict,
    snoozeMin: s.snoozeMin,
    sound: s.sound,
    tip: s.tip,
    lang: s.lang,
  });

  const broadcast = (s) => {
    for (const win of s.windows) {
      if (!win.isDestroyed()) win.webContents.send('break:state', view(s));
    }
  };

  /** result: done | skipped | snoozed, or null to just close (app quitting). */
  const end = (result) => {
    const s = session;
    if (!s) return;
    session = null;
    s.closing = true;
    clearInterval(s.timer);
    for (const win of s.windows) if (!win.isDestroyed()) win.destroy();
    if (result) onFinish(result);
  };

  ipcMain.on('break:action', (event, action) => {
    const s = session;
    if (!s?.windows.some((win) => !win.isDestroyed() && win.webContents === event.sender)) return;
    if (action === 'close' && s.phase === 'done') end('done');
    if (s.strict) return;
    if (action === 'snooze') end('snoozed');
    if (action === 'skip') end('skipped');
  });

  const createWindow = (bounds, strict) => {
    const win = new BrowserWindow({
      ...bounds,
      frame: false,
      transparent: !strict,
      backgroundColor: strict ? '#17121f' : '#00000000',
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
    win.setAlwaysOnTop(true, strict ? 'screen-saver' : 'floating');
    if (strict) {
      win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      });
    }
    win.on('close', (event) => {
      if (!session || session.closing) return;
      event.preventDefault();
      if (!session.strict) end('skipped');
    });
    return win;
  };

  const cardBounds = () => {
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    return {
      ...CARD,
      x: Math.round(area.x + (area.width - CARD.width) / 2),
      y: Math.round(area.y + (area.height - CARD.height) / 2),
    };
  };

  const tick = async (s) => {
    if (s.ticking || session !== s) return;
    s.ticking = true;
    try {
      const now = Date.now();
      const dt = Math.min(2, (now - s.last) / 1000);
      s.last = now;
      if (s.phase === 'running') {
        s.waiting = s.requireIdle && (await idle.read(0)) < ACTIVE_IDLE_SEC;
        if (!s.waiting) s.remaining = Math.max(0, s.remaining - dt);
        if (s.remaining === 0) {
          s.phase = 'done';
          s.doneAt = now;
        }
      } else {
        const since = now - s.doneAt;
        const back = idle.reliable && (await idle.read(0)) < ACTIVE_IDLE_SEC;
        if ((since > 5000 && back) || since > 120_000) {
          end('done');
          return;
        }
      }
      if (session === s) broadcast(s);
    } finally {
      s.ticking = false;
    }
  };

  const start = async ({ walk, lang }) => {
    if (session) return;
    const total = Math.round(walk.durationMin * 60);
    const s = {
      phase: 'running',
      total,
      remaining: total,
      waiting: false,
      requireIdle: walk.requireIdle && idle.reliable,
      strict: walk.strict,
      snoozeMin: walk.snoozeMin,
      sound: walk.sound,
      tip: Math.floor(Math.random() * 1000),
      lang,
      windows: [],
      last: Date.now(),
    };
    session = s;
    s.windows = walk.strict
      ? screen.getAllDisplays().map((display) => createWindow(display.bounds, true))
      : [createWindow(cardBounds(), false)];
    await Promise.all(s.windows.map((win) => win.loadFile(page)));
    if (session !== s) return;
    broadcast(s);
    for (const win of s.windows) {
      if (s.strict) {
        win.show();
        win.focus();
      } else {
        win.showInactive();
      }
    }
    s.last = Date.now();
    s.timer = setInterval(() => tick(s), 1000);
  };

  return { start, end };
};
