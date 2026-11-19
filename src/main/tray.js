import { Menu, Tray } from 'electron';

/** Rebuilds the menu only when its text changes: Linux tray menus flicker on every update. */
export const createTray = ({ icons, menu, onClick }) => {
  const tray = new Tray(icons.normal);
  tray.setToolTip('TakeCareDev');
  if (process.platform === 'win32') tray.on('click', onClick);

  let signature = '';
  const refresh = () => {
    const { items, sleeping } = menu();
    const next = JSON.stringify([sleeping, items]);
    if (next === signature) return;
    signature = next;
    tray.setContextMenu(Menu.buildFromTemplate(items));
    tray.setImage(sleeping ? icons.sleeping : icons.normal);
  };

  refresh();
  return { refresh };
};
