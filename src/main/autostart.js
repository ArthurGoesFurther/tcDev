import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from 'electron';

const linuxEntry = () =>
  path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
    'autostart',
    'razminka.desktop',
  );

const quote = (arg) => `"${arg.replace(/(["`$\\])/g, '\\$1')}"`;

const linuxCommand = () => {
  const parts = [];
  if (process.env.APPIMAGE) {
    parts.push(quote(process.env.APPIMAGE));
  } else {
    parts.push(quote(process.execPath));
    if (!app.isPackaged) parts.push(quote(app.getAppPath()), '--no-sandbox');
  }
  parts.push('--ozone-platform=x11');
  return parts.join(' ');
};

export const setAutostart = (enabled) => {
  if (process.platform !== 'linux') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      ...(process.env.PORTABLE_EXECUTABLE_FILE && { path: process.env.PORTABLE_EXECUTABLE_FILE }),
    });
    return;
  }
  const file = linuxEntry();
  if (!enabled) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Razminka',
      'Comment=Eye exercise and walking break reminders',
      `Exec=${linuxCommand()}`,
      'Terminal=false',
      'X-GNOME-Autostart-enabled=true',
      '',
    ].join('\n'),
  );
};
