'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createDesktopNotifications } = require('../src/desktop-notifications.cjs');
function fixture() {
  const notices = []; let saved = 0, time = 1000;
  class Notification extends EventEmitter {
    static isSupported() { return true; }
    constructor(options) { super(); this.options = options; notices.push(this); }
    show() {}
  }
  return { notices, get saved() { return saved; }, advance() { time += 30001; }, control: createDesktopNotifications({ Notification, saveOptIn: () => saved++, now: () => time }) };
}
test('native notifications request only on opt-in; requested is not delivered or OS authorization', () => {
  const f = fixture();
  assert.equal(f.control.done(), false); assert.equal(f.notices.length, 0);
  assert.equal(f.control.test().notifications, 'requested'); assert.equal(f.saved, 1);
  f.notices[0].emit('show'); assert.equal(f.control.view().notifications, 'sent');
  assert.equal(f.control.done(), false);
  f.advance(); assert.equal(f.control.done(), true);
  assert.equal(f.notices[1].options.body, 'Your work in Girru has finished.');
});
test('native failures and unsupported systems never report permission granted', () => {
  const f = fixture(); f.control.test(); f.notices[0].emit('failed', {}, 'private error');
  assert.deepEqual(f.control.view(), { notifications: 'failed' });
  const unavailable = createDesktopNotifications({ Notification: { isSupported: () => false } });
  assert.deepEqual(unavailable.test(), { notifications: 'unavailable' });
});
test('completion notification IPC refuses foreground, remote, subframe and unrelated contents', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../src/main.cjs'), 'utf8');
  const start = source.indexOf("ipcMain.handle('dpro:notify-done'"), end = source.indexOf('// Native permission controls', start);
  let handler, sent = 0, focused = true;
  const frame = { url: 'http://127.0.0.1:42522/' }, contents = { mainFrame: frame };
  const context = { runtime: {}, appOrigin: 'http://127.0.0.1:42522', mainWindow: { webContents: contents, isFocused: () => focused }, URL, ipcMain: { handle: (_, fn) => { handler = fn; } }, notificationControl: { done: () => { sent++; return true; } } };
  vm.runInNewContext(source.slice(start, end), context);
  const event = { sender: contents, senderFrame: frame };
  assert.equal(handler(event), false); focused = false;
  assert.equal(handler({ sender: {}, senderFrame: frame }), false);
  assert.equal(handler({ sender: contents, senderFrame: { url: frame.url } }), false);
  frame.url = 'https://foreign.invalid/'; assert.equal(handler(event), false);
  frame.url = context.appOrigin + '/'; assert.equal(handler(event), true); assert.equal(sent, 1);
});
