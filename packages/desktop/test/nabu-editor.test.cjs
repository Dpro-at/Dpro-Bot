const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { installNabuEditor, loopbackOrigin, CHANNELS } = require('../src/nabu-editor.cjs');

class Contents extends EventEmitter {
  mainFrame = { url: 'http://127.0.0.1:42522/' };
  sent = []; url = ''; destroyed = false; loads = 0; dirty = false;
  session = { setPermissionCheckHandler() {}, setPermissionRequestHandler() {} };
  send(channel, value) { this.sent.push({ channel, value }); }
  getZoomFactor() { return 1; }
  isDestroyed() { return this.destroyed; }
  setWindowOpenHandler(fn) { this.open = fn; }
  getURL() { return this.url; }
  async loadURL(url) { this.loads++; if (this.failLoad) throw Error('Offline'); this.url = url; }
  focus() {}
  close() {
    let discard = false;
    if (this.dirty) this.emit('will-prevent-unload', { preventDefault() { discard = true; } });
    if (this.dirty && !discard) return;
    this.destroyed = true; this.emit('destroyed');
  }
}
function fixture({ start, origin = 'http://127.0.0.1:42522' } = {}) {
  const ipc = new EventEmitter(); ipc.handlers = new Map();
  ipc.handle = (key, fn) => ipc.handlers.set(key, fn); ipc.removeHandler = key => ipc.handlers.delete(key);
  const win = new EventEmitter(); win.webContents = new Contents(); win.isDestroyed = () => false;
  win.getContentSize = () => [1280, 720]; win.close = () => win.emit('closed');
  const views = [];
  win.contentView = { children:[],addChildView(view) {this.children.push(view);},removeChildView(view) {this.children=this.children.filter(x=>x!==view);} };
  class View { webContents = new Contents(); constructor(options) { this.options = options; views.push(this); } setVisible(value) { this.visible = value; } setBounds(value) { this.bounds = value; } }
  let starts = 0, stops = 0, discard = 0;
  const host = { async start() { starts++; return start ? await start() : { origin: 'http://127.0.0.1:42630', url: 'http://127.0.0.1:42630/?tkn=private-token' }; }, async stop() { stops++; } };
  const controller = installNabuEditor({ win, electron: { ipcMain: ipc, WebContentsView: View, dialog: { showMessageBoxSync() { return discard; } } }, getOrigin: () => origin, createHost: () => host });
  const event = () => ({ sender: win.webContents, senderFrame: win.webContents.mainFrame });
  const select = (mode, extras = {}) => ipc.handlers.get(CHANNELS.select)(event(), { mode, top: 48, bottom: 32, ...extras });
  return { win, ipc, views, controller, event, select, starts: () => starts, stops: () => stops, discard: () => { discard = 1; } };
}

test('only a precise loopback application can activate the local editor', async () => {
  for (const origin of ['https://remote.example', 'http://localhost:42522', 'file:///tmp/page', 'http://127.0.0.1:42522/path']) assert.equal(loopbackOrigin(origin), false);
  const f = fixture({ origin: 'https://remote.example' });
  assert.equal(await f.select('code'), null); assert.equal(f.starts(), 0); await f.controller.stop();
});
test('foreign contents, subframes, extra keys and invalid layout cannot activate Code', async () => {
  const f = fixture(); const handle = f.ipc.handlers.get(CHANNELS.select);
  assert.equal(await handle({ sender: new Contents(), senderFrame: {} }, { mode: 'code', top: 48 }), null);
  assert.equal(await handle({ sender: f.win.webContents, senderFrame: { url: f.win.webContents.mainFrame.url } }, { mode: 'code', top: 48 }), null);
  for (const extra of [{ command: 'run' }, { top: NaN }, { top: 1 }, { top: 200 }, {bottom:NaN}, {bottom:-1}, {bottom:97}]) assert.equal(await f.select('code', extra), null);
  assert.equal(f.starts(), 0); await f.controller.stop();
});
test('Code lives in one retained child view, and mode state never exposes the connection token', async () => {
  const f = fixture(); await f.select('code'); const v = f.views[0];
  assert.equal(f.controller.state().mode, 'code'); assert.equal(v.visible, true);
  assert.deepEqual(v.bounds, { x: 0, y: 48, width: 1280, height: 640 });
  assert.equal(v.options.webPreferences.sandbox, true); assert.equal(v.options.webPreferences.nodeIntegration, false);
  await f.select('chat'); await f.select('code');
  assert.equal(f.views.length, 1); assert.equal(v.webContents.loads, 1); assert.equal(f.starts(), 1);
  assert.equal(JSON.stringify(f.win.webContents.sent).includes('private-token'), false);
  await f.controller.stop(); assert.equal(f.stops(), 1); assert.equal(f.ipc.handlers.size, 0);
});
test('choosing Chat during startup never switches back when startup completes', async () => {
  let resolve; const f = fixture({ start: () => new Promise(r => { resolve = r; }) });
  const pending = f.select('code'); await new Promise(r => setImmediate(r));
  await f.select('chat'); resolve({ origin: 'http://127.0.0.1:42630', url: 'http://127.0.0.1:42630/?tkn=private-token' });
  await pending; assert.equal(f.views.length, 0); assert.equal(f.controller.state().mode, 'chat'); await f.controller.stop();
});
test('Code and Chat shortcuts work from the editor without granting Girru IPC to it', async () => {
  const f = fixture(); await f.select('code');
  const v = f.views[0]; v.webContents.emit('before-input-event', { preventDefault() {} }, { type: 'keyDown', code: 'Digit2', key: '™', meta: true, alt: true });
  assert.equal(v.visible, false); assert.equal(f.controller.state().mode, 'chat');
  assert.equal(await f.ipc.handlers.get(CHANNELS.status)({ sender: v.webContents, senderFrame: v.webContents.mainFrame }), null);
  await f.controller.stop();
});
test('unsaved work defaults to keep working, can be retried and requires explicit discard', async () => {
  const f = fixture(); await f.select('code'); const v = f.views[0]; v.webContents.dirty = true;
  assert.equal(await f.controller.requestClose(), false); assert.equal(v.webContents.destroyed, false);
  f.discard(); assert.equal(await f.controller.requestClose(), true); assert.equal(v.webContents.destroyed, true);
  await f.controller.stop();
});
test('a crashed renderer can reload and refuses navigation outside its authenticated host', async () => {
  const f = fixture(); await f.select('code'); const wc = f.views[0].webContents;
  let blocked = false; wc.emit('will-navigate', { preventDefault() { blocked = true; } }, 'https://external.example'); assert.equal(blocked, true);
  wc.emit('render-process-gone'); assert.equal(f.controller.state().mode, 'chat');
  await f.select('code'); assert.equal(wc.loads, 2); assert.equal(f.controller.state().mode, 'code'); await f.controller.stop();
});
test('closing during startup stops the owned host and ignores its late ready event', async () => {
  let resolve; const f = fixture({ start: () => new Promise(r => { resolve = r; }) });
  const pending = f.select('code'); await new Promise(r => setImmediate(r)); await f.controller.stop();
  resolve({ origin: 'http://127.0.0.1:42630', url: 'http://127.0.0.1:42630/?tkn=private-token' }); await pending;
  assert.equal(f.views.length, 0); assert.equal(f.stops(), 1);
});

// The surrounding Girru navigation must remain reachable while editing.
test('editor bounds preserve the footer and follow zoom without reloading the editor',async()=>{
 const f=fixture();await f.select('code');const view=f.views[0];
 f.win.webContents.getZoomFactor=()=>1.25;
 f.ipc.emit(CHANNELS.layout,f.event(),{top:40,bottom:24});
 assert.deepEqual(view.bounds,{x:0,y:50,width:1280,height:640});
 f.ipc.emit(CHANNELS.layout,f.event(),{top:40,bottom:-1});
 assert.deepEqual(view.bounds,{x:0,y:50,width:1280,height:640});
 assert.equal(view.webContents.loads,1);await f.controller.stop();
});

test('reloading or losing the Girru renderer hides the local editor',async()=>{
 const f=fixture();await f.select('code');const view=f.views[0];
 f.win.webContents.emit('did-start-navigation',{},'http://127.0.0.1:42522/',false,true);
 assert.equal(view.visible,false);assert.equal(f.controller.state().mode,'chat');
 await f.select('code');f.win.webContents.emit('render-process-gone');
 assert.equal(view.visible,false);assert.equal(view.webContents.loads,1);
 await f.controller.stop();
});

test('shutdown tolerates Electron releasing the closed child webContents',async()=>{
 const f=fixture();await f.select('code');assert.equal(await f.controller.requestClose(),true);
 f.views[0].webContents=undefined;await f.controller.stop();assert.equal(f.stops(),1);
});

// These fixtures exercise files created by a competing writer without replacing its data.
test('preview settings creation never overwrites an existing or linked account file',t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {initializeSettings}=require('../scripts/configure-editor-preview.cjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dpro-preview-settings-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const settings=path.join(root,'desktop.json');
 assert.equal(initializeSettings(settings,'http://127.0.0.1:42522'),true);
 const original=fs.readFileSync(settings,'utf8');
 assert.equal(initializeSettings(settings,'http://127.0.0.1:42524'),false);
 assert.equal(fs.readFileSync(settings,'utf8'),original);
 if(process.platform!=='win32'){
  const link=path.join(root,'linked.json');fs.symlinkSync(settings,link);
  assert.equal(initializeSettings(link,'http://127.0.0.1:42524'),false);
  assert.equal(fs.readFileSync(settings,'utf8'),original);
 }
});
test('runtime validation binds its size check and bounded read to the opened manifest',t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {compatibleRuntime}=require('../src/nabu-editor.cjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dpro-runtime-manifest-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'nabu/dpro'),{recursive:true});
 const manifest=path.join(root,'nabu/runtime.json');
 fs.writeFileSync(manifest,JSON.stringify({protocolVersion:1,entry:'dpro/editor-runtime.mjs'}));
 fs.writeFileSync(path.join(root,'nabu/dpro/editor-runtime.mjs'),'');
 const fstat=fs.fstatSync;let swapped=false;
 fs.fstatSync=fd=>{const info=fstat(fd);if(!swapped){swapped=true;fs.renameSync(manifest,manifest+'.old');fs.writeFileSync(manifest,'invalid replacement');}return info;};
 try {assert.equal(compatibleRuntime(root),true);assert.equal(swapped,true);}finally{fs.fstatSync=fstat;}
 assert.equal(compatibleRuntime(root),false);
 fs.writeFileSync(manifest,' '.repeat(8193));assert.equal(compatibleRuntime(root),false);
});
