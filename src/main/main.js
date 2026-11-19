import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Menu, Notification, app, ipcMain } from 'electron';
import { EXERCISE_IDS } from '../shared/exercises.js';
import { formatLeft, resolveLanguage, translate } from '../shared/i18n.js';
import { setAutostart } from './autostart.js';
import { createBreakController } from './break.js';
import { createCursorTracker, detectSession } from './cursor.js';
import { createFacePresenter } from './face.js';
import { createAppIcon, createTrayIcons } from './icons.js';
import { createIdleSource } from './idle.js';
import { Scheduler } from './scheduler.js';
import { createSettingsWindow } from './settings-window.js';
import { createSettingsStore, createStats } from './store.js';
import { createTray } from './tray.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PRELOAD = path.join(here, '../preload/preload.cjs');
const page = (name) => path.join(here, `../renderer/${name}.html`);

const session = detectSession();
// Electron fills in ozone-platform=wayland on its own, so only an explicit flag counts as a choice.
const ozoneArg = process.argv.find((arg) => arg.startsWith('--ozone-platform='));
const ozone = ozoneArg?.split('=')[1] ?? app.commandLine.getSwitchValue('ozone-platform');

if (process.env.TCDEV_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.TCDEV_DATA_DIR));
}
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (session.xwayland && !ozoneArg) {
  // Native Wayland hides the pointer from apps and ignores window positions; XWayland allows both.
  // Not app.relaunch(): its helper runs from the AppImage mount, which disappears when we exit.
  spawn(
    process.env.APPIMAGE || process.execPath,
    [...process.argv.slice(1), '--ozone-platform=x11'],
    {
      detached: true,
      stdio: 'inherit',
    },
  ).unref();
  app.exit(0);
} else if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on('window-all-closed', () => {});
  app.whenReady().then(main);
}

async function main() {
  if (process.platform === 'darwin') app.dock?.hide();
  if (process.platform === 'win32') app.setAppUserModelId('dev.tcdev.app');
  Menu.setApplicationMenu(
    process.platform === 'darwin'
      ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }])
      : null,
  );
  if (!app.isPackaged) {
    app.on('web-contents-created', (_event, contents) => {
      contents.on('console-message', ({ level, message, sourceId, lineNumber }) => {
        if (level === 'info') return;
        console.log(`[renderer:${level}] ${message} (${sourceId}:${lineNumber})`);
      });
    });
  }

  const dataDir = app.getPath('userData');
  const store = createSettingsStore(path.join(dataDir, 'settings.json'));
  const stats = createStats(path.join(dataDir, 'stats.json'));
  const idle = await createIdleSource(session);
  const cursor = createCursorTracker(session, ozone);
  const appIcon = createAppIcon();
  console.log(
    `[tcdev] ${process.platform}${session.wayland ? ' wayland' : ''}, cursor: ${cursor.mode}, idle: ${idle.name}, data: ${dataDir}`,
  );

  const lang = () => resolveLanguage(store.get().language, app.getLocale());
  const t = (key, ...args) => translate(lang(), key, ...args);
  const clockTime = (ms) =>
    new Date(ms).toLocaleTimeString(lang(), { hour: '2-digit', minute: '2-digit' });

  const notify = (title, body) => {
    if (Notification.isSupported())
      new Notification({ title, body, icon: appIcon, silent: true }).show();
  };

  const scheduler = new Scheduler({
    settings: store.get(),
    readIdle: () => idle.read(),
    idleReliable: idle.reliable,
  });
  const face = createFacePresenter({ preload: PRELOAD, page: page('face'), cursor });
  const breaks = createBreakController({
    preload: PRELOAD,
    page: page('break'),
    idle,
    onFinish: (result) => {
      scheduler.finishWalk(result);
      stats.bump(result === 'done' ? 'walks' : result);
      refresh();
    },
  });
  const settingsWindow = createSettingsWindow({
    preload: PRELOAD,
    page: page('settings'),
    icon: appIcon,
  });

  let sequence = 0;
  let lastExercise = null;
  const pickExercise = () => {
    const { exercises, order } = store.get().eyes;
    if (order === 'sequential') return exercises[sequence++ % exercises.length];
    const pool = exercises.length > 1 ? exercises.filter((id) => id !== lastExercise) : exercises;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const runEye = async (exercise = pickExercise()) => {
    lastExercise = exercise;
    try {
      if (await face.show({ exercise, eyes: store.get().eyes, lang: lang() })) stats.bump('eyes');
    } catch (error) {
      console.error('[tcdev] eye exercise failed', error);
    } finally {
      scheduler.finishEye();
      refresh();
    }
  };

  const runWalk = () =>
    breaks.start({ walk: store.get().walk, lang: lang() }).catch((error) => {
      console.error('[tcdev] break failed', error);
      breaks.end(null);
      scheduler.finishWalk('skipped');
    });

  const commands = {
    eyeNow: (exercise) => {
      if (scheduler.begin('eye')) runEye(EXERCISE_IDS.includes(exercise) ? exercise : undefined);
    },
    walkNow: () => {
      if (scheduler.begin('walk')) runWalk();
    },
    skipBreak: () => breaks.end('skipped'),
    pause: (minutes) => {
      face.cancel();
      breaks.end('skipped');
      scheduler.pause(minutes ?? Infinity);
    },
    resume: () => scheduler.resume(),
    reset: () => {
      scheduler.resetTimers();
      refresh();
    },
    settings: () => settingsWindow.open(),
    quit: () => app.quit(),
  };

  const trayMenu = () => {
    const status = scheduler.status();
    const today = stats.today();
    const left = (sec, on, off) => (sec === null ? t(off) : t(on, formatLeft(lang(), sec)));
    const items = status.paused
      ? [
          {
            label: Number.isFinite(status.pausedUntil)
              ? t('tray.pausedUntil', clockTime(status.pausedUntil))
              : t('tray.paused'),
            enabled: false,
          },
        ]
      : [
          { label: left(status.eyeLeft, 'tray.eyesIn', 'tray.eyesOff'), enabled: false },
          { label: left(status.walkLeft, 'tray.walkIn', 'tray.walkOff'), enabled: false },
        ];
    items.push(
      { label: t('tray.today', today.eyes, today.walks), enabled: false },
      { type: 'separator' },
      { label: t('tray.eyeNow'), enabled: !status.busy, click: () => commands.eyeNow() },
      status.busy === 'walk'
        ? { label: t('tray.skipBreak'), click: commands.skipBreak }
        : { label: t('tray.walkNow'), enabled: !status.busy, click: commands.walkNow },
      { type: 'separator' },
      status.paused
        ? { label: t('tray.resume'), click: commands.resume }
        : {
            label: t('tray.pause'),
            submenu: [
              ...[30, 60, 120].map((m) => ({
                label: t(`tray.pause${m}`),
                click: () => commands.pause(m),
              })),
              { label: t('tray.pauseForever'), click: () => commands.pause(Infinity) },
            ],
          },
      { label: t('tray.reset'), click: commands.reset },
      { type: 'separator' },
      { label: t('tray.settings'), click: commands.settings },
      { label: t('tray.quit'), click: commands.quit },
    );
    return { items, sleeping: status.paused };
  };

  const tray = createTray({ icons: createTrayIcons(), menu: trayMenu, onClick: commands.settings });
  const statusPayload = () => ({ ...scheduler.status(), today: stats.today() });
  function refresh() {
    tray.refresh();
    settingsWindow.send('app:status', statusPayload());
  }

  const applyAutostart = (enabled) => {
    try {
      setAutostart(enabled);
    } catch (error) {
      console.error('[tcdev] autostart failed', error);
    }
  };

  scheduler.on('eye-due', () => runEye());
  scheduler.on('walk-due', () => runWalk());
  scheduler.on('walk-warning', (sec) =>
    notify(
      t('notify.walkSoonTitle'),
      t('notify.walkSoonBody', sec < 60 ? t('time.sec', sec) : formatLeft(lang(), sec)),
    ),
  );
  scheduler.on('natural-break', () => console.log('[tcdev] away long enough, timers restarted'));
  scheduler.on('paused', refresh);
  scheduler.on('resumed', refresh);

  store.onChange((next, prev) => {
    scheduler.setSettings(next);
    if (next.autostart !== prev.autostart) applyAutostart(next.autostart);
    settingsWindow.send('settings:changed', { settings: next, lang: lang() });
    refresh();
  });

  const info = {
    version: app.getVersion(),
    platform: process.platform,
    wayland: session.wayland,
    cursorMode: cursor.mode,
    canFollow: cursor.canFollow,
    idleSource: idle.name,
    idleReliable: idle.reliable,
  };
  ipcMain.handle('settings:load', () => ({
    settings: store.get(),
    lang: lang(),
    info,
    status: statusPayload(),
  }));
  ipcMain.handle('settings:update', (_event, patch) => store.update(patch));
  ipcMain.handle('app:command', (_event, name, arg) => {
    if (Object.hasOwn(commands, name)) commands[name](arg);
  });

  app.on('second-instance', commands.settings);
  app.on('before-quit', () => {
    face.cancel();
    breaks.end(null);
  });

  if (store.get().autostart) applyAutostart(true);
  setInterval(() => scheduler.tick(), 1000);
  setInterval(refresh, 1000);

  if (!store.existed) {
    settingsWindow.open();
    notify(t('notify.runningTitle'), t('notify.runningBody'));
  }
}
