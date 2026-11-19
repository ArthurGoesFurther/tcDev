const { contextBridge, ipcRenderer } = require('electron');

const subscribe = (channel) => (callback) => {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('tcdev', {
  face: {
    onStart: subscribe('face:start'),
    done: () => ipcRenderer.send('face:done'),
  },
  breakScreen: {
    onState: subscribe('break:state'),
    action: (name) => ipcRenderer.send('break:action', name),
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch),
    command: (name, arg) => ipcRenderer.invoke('app:command', name, arg),
    onStatus: subscribe('app:status'),
    onChanged: subscribe('settings:changed'),
  },
});
