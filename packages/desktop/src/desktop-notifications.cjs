'use strict';
// Electron owns native authorization. A submitted test is not proof of OS permission.
function createDesktopNotifications({ Notification, optedIn = false, saveOptIn = () => {}, now = Date.now }) {
  let state = 'not-requested', lastSent = -Infinity;
  const active = new Set();
  function view() { return { notifications: state }; }
  function send(test) {
    if (!Notification.isSupported()) { state = 'unavailable'; return false; }
    if (!test && (!optedIn || now() - lastSent < 30000)) return false;
    try {
      const notice = new Notification({ title: 'Girru', body: test ? 'Notifications are ready. You can change them in System Settings.' : 'Your work in Girru has finished.', silent: false });
      active.add(notice);
      notice.once('show', () => { if (test) state = 'sent'; });
      notice.once('failed', () => { if (test) state = 'failed'; active.delete(notice); });
      notice.once('close', () => active.delete(notice));
      if (test) { state = 'requested'; saveOptIn(); optedIn = true; }
      lastSent = now(); notice.show(); return true;
    } catch { if (test) state = 'failed'; return false; }
  }
  return { view, test: () => { send(true); return view(); }, done: () => send(false) };
}
module.exports = { createDesktopNotifications };
