'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const CHANNELS = Object.freeze({ status: 'dpro:nabu-status', select: 'dpro:nabu-select', layout: 'dpro:nabu-layout', state: 'dpro:nabu-state' });

function compatibleRuntime(root) {
  let fd;
  try {
    if (!root || !path.isAbsolute(root)) return false;
    fd = fs.openSync(path.join(root, 'nabu', 'runtime.json'), fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const info = fs.fstatSync(fd);
    if (!info.isFile() || info.size > 8192) return false;
    const bytes = Buffer.alloc(8193);
    const count = fs.readSync(fd, bytes, 0, bytes.length, 0);
    if (count > 8192) return false;
    const value = JSON.parse(bytes.subarray(0, count).toString('utf8'));
    return value.protocolVersion === 1 && value.entry === 'dpro/editor-runtime.mjs' && fs.statSync(path.join(root, 'nabu', value.entry)).isFile();
  } catch { return false; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}

function loopbackOrigin(value) {
  try { const u = new URL(value); return u.protocol === 'http:' && u.hostname === '127.0.0.1' && !!u.port && u.origin === value; } catch { return false; }
}

/** Optional desktop adapter. The editor implementation stays in the shared Nabu runtime. */
function installNabuEditor({ win, electron, getOrigin, runtimeRoot, node, dataDir, createHost, onLog = () => {} }) {
  const { ipcMain, WebContentsView, dialog } = electron;
  const installed = createHost ? true : compatibleRuntime(runtimeRoot);
  let mode = 'chat', desired = 'chat', busy = false, error = null, top = 48, bottom = 32;
  let view = null, host = null, starting = null, address = null, editorOrigin = null;
  let activated = false;
  let generation = 0, disposed = false, closePromise = null, stopPromise = null, approvedClose = false;
  const cleanup = [];
  const listen = (target, name, callback) => { target.on(name, callback); cleanup.push(() => target.removeListener(name, callback)); };
  const available = () => installed && loopbackOrigin(getOrigin());
  const state = () => ({ available: available(), mode, busy, error });
  const notify = () => { if (!disposed && !win.webContents.isDestroyed()) win.webContents.send(CHANNELS.state, state()); };
  const allowed = event => !disposed && available() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && (() => { try { return new URL(event.senderFrame.url).origin === getOrigin(); } catch { return false; } })();
  const validBottom = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 96;
  const validTop = value => typeof value === 'number' && Number.isFinite(value) && value >= 32 && value <= 160;
  const layout = () => {
    if (!view || disposed || win.isDestroyed()) return;
    const [width, height] = win.getContentSize();
    const zoom = win.webContents.getZoomFactor();
    const y = Math.min(Math.round(top * zoom), Math.max(0, height - 1));
    const footer = Math.round(bottom * zoom);
    view.setBounds({ x: 0, y, width, height: Math.max(1, height - y - footer) });
  };
  const hide = () => { desired = mode = 'chat'; busy = false; generation++; view?.setVisible(false); notify(); };
  const runtimeExited = () => { address = null; host = null; starting = null; error = 'The editor stopped. Select Code to reconnect.'; hide(); };
  async function ready() {
    if (address) return address;
    if (starting) return starting;
    starting = (async () => {
      const factory = createHost || (await import(pathToFileURL(path.join(runtimeRoot, 'nabu/dpro/editor-runtime.mjs')).href));
      if (disposed) throw Error('Stopped');
      if (!createHost && factory.protocolVersion !== 1) throw Error('Unsupported editor runtime');
      host = (createHost || factory.createEditorHost)({ node, dataDir, onLog, onExit: runtimeExited });
      const result = await host.start();
      const u = new URL(result.url);
      if (!loopbackOrigin(result.origin) || u.origin !== result.origin || !u.searchParams.get('tkn')) throw Error('Invalid editor address');
      address = result;
      return result;
    })();
    try { return await starting; }
    catch (failure) { starting = null; const failedHost = host; host = null; await failedHost?.stop().catch(() => {}); throw failure; }
  }
  const shortcut = (event, input) => {
    const key = input.code === 'Digit1' ? '1' : input.code === 'Digit2' ? '2' : input.key;
    if (input.type !== 'keyDown' || !input.alt || input.shift || !(input.meta || input.control) || !['1', '2'].includes(key) || !available() || !activated) return;
    event.preventDefault(); void select(key === '1' ? 'code' : 'chat');
  };
  async function select(next) {
    if (!available() || disposed) return state();
    const epoch = ++generation;
    desired = next; error = null;
    if (next === 'chat') { mode = 'chat'; busy = false; view?.setVisible(false); win.webContents.focus(); notify(); return state(); }
    busy = true; notify();
    try {
      const target = await ready();
      if (disposed || epoch !== generation || desired !== 'code') return state();
      if (!view?.webContents || view.webContents.isDestroyed()) {
        view = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, partition: 'persist:dpro-nabu-code' } });
        view.setVisible(false);
        win.contentView.addChildView(view);
        view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        view.webContents.session.setPermissionCheckHandler(() => false);
        view.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
        const guard = (event, url) => { try { if (new URL(url).origin === editorOrigin) return; } catch {} event.preventDefault(); };
        listen(view.webContents, 'will-navigate', guard); listen(view.webContents, 'will-redirect', guard);
        listen(view.webContents, 'will-attach-webview', event => event.preventDefault());
        listen(view.webContents, 'before-input-event', shortcut);
        listen(view.webContents, 'render-process-gone', () => { editorOrigin = null; error = 'The editor stopped. Select Code to reconnect.'; hide(); });
      }
      if (editorOrigin !== target.origin || !view.webContents.getURL()) {
        editorOrigin = target.origin;
        await view.webContents.loadURL(target.url);
      }
      if (disposed || epoch !== generation || desired !== 'code') return state();
      mode = 'code'; busy = false; layout(); view.setVisible(true); view.webContents.focus(); notify();
    } catch {
      if (!disposed && epoch === generation) { editorOrigin = null; error = 'The editor could not open. Select Code to try again.'; hide(); }
    }
    return state();
  }
  function requestClose() {
    if (closePromise) return closePromise;
    if (!view?.webContents || view.webContents.isDestroyed()) return Promise.resolve(true);
    const contents = view.webContents;
    const pending = new Promise(resolve => {
      const finish = value => { onLog(value?'Editor close approved.':'Editor close cancelled.'); contents.removeListener('destroyed', closed); contents.removeListener('will-prevent-unload', prevented); resolve(value); };
      const closed = () => finish(true);
      const prevented = event => {
        const discard = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Keep Working', 'Discard Changes'], defaultId: 0, cancelId: 0, noLink: true, message: 'The editor has unsaved work.', detail: 'Keep working to save your files before closing.' }) === 1;
        if (discard) event.preventDefault(); else finish(false);
      };
      contents.once('destroyed', closed); contents.once('will-prevent-unload', prevented);
      contents.close({ waitForBeforeUnload: true });
    });
    closePromise = pending;
    void pending.finally(() => { if (closePromise === pending) closePromise = null; });
    return pending;
  }
  const statusHandler = event => allowed(event) ? state() : null;
  const selectHandler = (event, message) => {
    if (!allowed(event) || !message || Object.keys(message).sort().join(',') !== 'bottom,mode,top' || !['code', 'chat'].includes(message.mode) || !validTop(message.top) || !validBottom(message.bottom)) return null;
    top = message.top; bottom = message.bottom; if(message.mode==='code')activated=true; return select(message.mode);
  };
  const layoutHandler = (event, value) => { if (allowed(event) && value && Object.keys(value).sort().join(',') === 'bottom,top' && validTop(value.top) && validBottom(value.bottom)) { top = value.top; bottom = value.bottom; layout(); } };
  ipcMain.handle(CHANNELS.status, statusHandler); ipcMain.handle(CHANNELS.select, selectHandler);
  listen(ipcMain, CHANNELS.layout, layoutHandler);
  cleanup.push(() => { ipcMain.removeHandler(CHANNELS.status); ipcMain.removeHandler(CHANNELS.select); });
  listen(win, 'resize', layout);
  listen(win.webContents, 'did-start-navigation', (_event,_url,inPlace,isMainFrame) => {if(isMainFrame&&!inPlace)hide();});
  listen(win.webContents, 'render-process-gone', hide);
  listen(win.webContents, 'before-input-event', shortcut);
  listen(win.webContents, 'did-start-loading', hide);
  listen(win, 'close', event => {
    if (approvedClose || !view || view.webContents.isDestroyed()) return;
    event.preventDefault();
    void requestClose().then(ok => { if (ok && !win.isDestroyed()) { approvedClose = true; win.close(); } });
  });
  const stop = () => {
    if (stopPromise) return stopPromise;
    disposed = true; generation++;
    for (const remove of cleanup.splice(0)) remove();
    stopPromise = (async () => {
      try {
        if (view) {
          if (!win.isDestroyed() && win.contentView.children.includes(view)) win.contentView.removeChildView(view);
          const contents=view.webContents;
          if (contents && !contents.isDestroyed()) contents.close();
          view = null;
        }
      } finally { await host?.stop(); }
      onLog('Editor runtime stopped.');
    })();
    return stopPromise;
  };
  listen(win, 'closed', () => { void stop(); });
  return { requestClose, stop, state };
}
module.exports = { installNabuEditor, compatibleRuntime, loopbackOrigin, CHANNELS };
