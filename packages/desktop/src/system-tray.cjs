'use strict';
const path = require('node:path');
function createSystemTray({ electron, platform, getWindow, navigate, checkUpdates }) {
  if (!['darwin', 'win32'].includes(platform)) return null;
  const image = electron.nativeImage.createFromPath(path.join(__dirname, 'pages', platform === 'darwin' ? 'trayTemplate.png' : 'tray.png')).resize({ width: platform === 'darwin' ? 18 : 24, height: platform === 'darwin' ? 18 : 24 });
  if (platform === 'darwin') image.setTemplateImage(true);
  const tray = new electron.Tray(image);
  tray.setToolTip('Girru');
  const show = () => { const win = getWindow(); if (!win || win.isDestroyed()) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); };
  const open = destination => { show(); navigate(destination); };
  tray.setContextMenu(electron.Menu.buildFromTemplate([
    { label: 'Open Girru', click: show },
    { label: 'New Chat', click: () => open('new-chat') },
    { label: 'Tools', submenu: [
      { label: 'Agents', click: () => open('agents') },
      { label: 'Library', click: () => open('library') },
      { label: 'Board', click: () => open('board') },
      { label: 'Memory', click: () => open('memory') },
    ] },
    { type: 'separator' },
    { label: 'Settings…', click: () => open('settings') },
    { label: 'Check for Updates…', click: () => { open('about'); void Promise.resolve().then(checkUpdates).catch(() => {}); } },
    { type: 'separator' },
    { label: 'Quit Girru', click: () => electron.app.quit() },
  ]));
  tray.on('double-click', show);
  return tray;
}
module.exports = { createSystemTray };
