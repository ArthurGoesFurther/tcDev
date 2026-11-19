import { BrowserWindow, nativeTheme } from 'electron';

export const createSettingsWindow = ({ preload, page, icon }) => {
  let win = null;

  const open = () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      return;
    }
    win = new BrowserWindow({
      width: 640,
      height: 860,
      minWidth: 520,
      minHeight: 480,
      show: false,
      icon,
      title: 'TakeCareDev',
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1a22' : '#f5f3fa',
      autoHideMenuBar: true,
      webPreferences: { preload, sandbox: true },
    });
    win.removeMenu();
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => (win = null));
    win.loadFile(page);
  };

  const send = (channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  return { open, send };
};
