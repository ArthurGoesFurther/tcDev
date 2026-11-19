import { execFile } from 'node:child_process';
import { powerMonitor } from 'electron';

const MUTTER_IDLE = [
  'call',
  '--session',
  '--dest',
  'org.gnome.Mutter.IdleMonitor',
  '--object-path',
  '/org/gnome/Mutter/IdleMonitor/Core',
  '--method',
  'org.gnome.Mutter.IdleMonitor.GetIdletime',
];

const mutterIdleSec = () =>
  new Promise((resolve) => {
    execFile('gdbus', MUTTER_IDLE, { timeout: 1500 }, (error, stdout) => {
      const match = !error && /uint64 (\d+)/.exec(stdout);
      resolve(match ? Number(match[1]) / 1000 : null);
    });
  });

/**
 * Seconds since the last keyboard/mouse input.
 * Chromium's idle query sees only X11 input, so on GNOME (Wayland included)
 * it asks Mutter directly; elsewhere it uses Electron's powerMonitor.
 */
export const createIdleSource = async ({ wayland }) => {
  let lockedAt = 0;
  powerMonitor.on('lock-screen', () => (lockedAt = Date.now()));
  powerMonitor.on('unlock-screen', () => (lockedAt = 0));
  const sinceLock = () => (lockedAt ? (Date.now() - lockedAt) / 1000 : 0);

  if (process.platform === 'linux' && (await mutterIdleSec()) !== null) {
    let cached = { at: 0, value: 0 };
    return {
      name: 'mutter',
      reliable: true,
      async read(maxAgeMs = 4000) {
        if (Date.now() - cached.at > maxAgeMs) {
          cached = { at: Date.now(), value: (await mutterIdleSec()) ?? 0 };
        }
        return Math.max(cached.value, sinceLock());
      },
    };
  }

  return {
    name: 'system',
    reliable: !(process.platform === 'linux' && wayland),
    read: async () => Math.max(powerMonitor.getSystemIdleTime(), sinceLock()),
  };
};
