'use strict';
const api = window.dproDesktop;
const toggle = document.getElementById('microphone');
const files = document.getElementById('files');
const next = document.getElementById('next');
const error = document.getElementById('error');
let busy = false;
function showNotifications(value) {
  const sent = value?.notifications === 'sent';
  document.getElementById('notifications').setAttribute('aria-checked', String(sent));
  document.getElementById('notifications-label').textContent = sent ? 'Test sent' : 'Enable';
  document.getElementById('notifications-status').textContent = ({ 'not-requested': 'Not requested', requested: 'Request sent. Check the system prompt or notification settings.', sent: 'Test sent. System Settings controls delivery.', failed: 'Test failed. Check notification settings and app signing.', unavailable: 'Unavailable on this device' })[value?.notifications] || 'Not requested';
}
function show(value) {
  if (!value) throw new Error('Unavailable');
  showNotifications(value);
  const granted = value.microphone === 'granted';
  toggle.setAttribute('aria-checked', String(granted));
  toggle.disabled = busy || granted || value.microphone === 'restricted';
  next.disabled = busy || !value.files;
  files.setAttribute('aria-checked', String(value.files));
  files.disabled = busy;
  document.getElementById('files-status').textContent = value.files ? 'Enabled' : (value.folders?.map(folder => `${folder.name}: ${folder.status === 'granted' ? 'Allowed' : folder.status === 'denied' ? 'Not allowed' : folder.status === 'missing' ? 'Not present' : 'Unavailable'}`).join(' · ') || 'Not requested');
  document.getElementById('files-label').textContent = value.files ? 'Enabled' : value.folders?.some(folder => folder.status === 'denied') ? 'Open settings' : 'Enable';
  document.getElementById('microphone-status').textContent = granted ? 'Enabled' : value.microphone === 'denied' ? 'Not enabled' : value.microphone === 'restricted' ? 'Restricted by your device administrator' : 'Not enabled yet';
  document.getElementById('microphone-label').textContent = granted ? 'Enabled' : value.microphone === 'denied' ? 'Open settings' : 'Enable';
  document.getElementById('help').textContent = value.files ? 'Protected-folder access is enabled. Choose Next to continue.' : 'Click Enable to request access. Previously denied requests must be changed in System Settings.';
  if (value.platform === 'win32') { document.getElementById('files').closest('.permission-row').hidden = true; document.getElementById('full-disk-row').hidden = true; }
}
async function refresh() { if (busy) return; try { show(await api.permissionStatus()); } catch { error.textContent = 'Permission status is unavailable. Focus this window to try again.'; } }
toggle.addEventListener('click', async () => {
  busy = true; toggle.disabled = true; next.disabled = true; error.textContent = '';
  try { const value = await api.enableMicrophone(); busy = false; show(value); }
  catch { busy = false; toggle.disabled = false; error.textContent = 'The permission request could not open. Try again.'; }
});
files.addEventListener('click', async () => {
  busy = true; files.disabled = true; toggle.disabled = true; next.disabled = true; error.textContent = '';
  try { const value = await api.enableFiles(); busy = false; show(value); } catch { busy = false; files.disabled = false; error.textContent = 'File access could not be checked. Try again.'; await refresh(); }
});
document.getElementById('notifications').addEventListener('click', async () => {
  const button = document.getElementById('notifications'); button.disabled = true;
  try { showNotifications(await api.enableNotifications());  }
  catch { error.textContent = 'Notifications could not be requested. Try System Settings.'; }
  finally { button.disabled = false; }
});
document.getElementById('notification-settings').addEventListener('click', async () => { try { await api.notificationSettings(); } catch { error.textContent = 'Notification settings could not open.'; } });
document.getElementById('full-disk').addEventListener('click', async () => {
  const button = document.getElementById('full-disk'); button.disabled = true;
  try { const result = await api.fullDiskSettings(); document.getElementById('full-disk-label').textContent = 'Check settings'; document.getElementById('full-disk-status').textContent = result?.status === 'unavailable' ? 'The protected-resource check is unavailable on this device.' : 'Access check attempted. Look for Girru in Full Disk Access and enable it yourself. This check does not confirm full disk access.'; }
  catch { error.textContent = 'The access request or System Settings could not open.'; }
  finally { button.disabled = false; }
});
next.addEventListener('click', async () => { next.disabled = true; try { if (!await api.permissionsNext()) await refresh(); } catch { error.textContent = 'Could not continue. Try again.'; await refresh(); } });
window.addEventListener('focus', refresh);
void refresh();
