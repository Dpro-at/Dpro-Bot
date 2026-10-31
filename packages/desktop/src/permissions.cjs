'use strict';
// Native permissions are device-local; never infer them from an account setting.
function permissionStatus(systemPreferences, platform) {
  return { platform, microphone: ['darwin', 'win32'].includes(platform) ? systemPreferences.getMediaAccessStatus('microphone') : 'unavailable' };
}
async function requestMicrophone(systemPreferences, shell, platform) {
  if (platform === 'win32') {
    if (systemPreferences.getMediaAccessStatus('microphone') === 'denied') await shell.openExternal('ms-settings:privacy-microphone');
    return permissionStatus(systemPreferences, platform);
  }
  if (platform !== 'darwin') return permissionStatus(systemPreferences, platform);
  const status = systemPreferences.getMediaAccessStatus('microphone');
  if (status === 'not-determined') await systemPreferences.askForMediaAccess('microphone');
  else if (status === 'denied') await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
  return permissionStatus(systemPreferences, platform);
}
module.exports = { permissionStatus, requestMicrophone };

// Probe only fixed protected directories, only after the owner asks. No file contents are read.
function createFilePermissions({ getPath, fs, platform }) {
  let requested = false;
  let folders = [];
  const view = () => ({ files: platform !== 'darwin' || (requested && folders.length === 3 && folders.every(item => ['granted', 'missing'].includes(item.status)) && folders.some(item => item.status === 'granted')), folders });
  async function check() {
    if (!requested || platform !== 'darwin') return view();
    const results = [];
    for (const [id, name] of [['documents', 'Documents'], ['downloads', 'Downloads'], ['desktop', 'Desktop']]) {
      try { const directory = await fs.promises.opendir(getPath(id)); await directory.close(); results.push({ name, status: 'granted' }); }
      catch (error) { results.push({ name, status: error.code === 'ENOENT' ? 'missing' : ['EACCES', 'EPERM'].includes(error.code) ? 'denied' : 'unavailable' }); }
    }
    folders = results;
    return view();
  }
  return { view, check, request: async () => { requested = true; return check(); } };
}
module.exports.createFilePermissions = createFilePermissions;

// A user-triggered access check lets macOS attribute the protected-resource request
// to this app. The handle is immediately closed without reading any bytes or granting FDA.
async function requestFullDiskRegistration({ fs, home, path, platform }) {
  if (platform !== 'darwin') return { status: 'unavailable' };
  for (const name of ['Safari/Bookmarks.plist', 'Safari/History.db']) {
    try {
      const handle = await fs.promises.open(path.join(home, 'Library', name), 'r');
      await handle.close();
      return { status: 'probe-accessible' };
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      return { status: ['EPERM', 'EACCES'].includes(error.code) ? 'access-blocked' : 'unavailable' };
    }
  }
  return { status: 'unavailable' };
}
module.exports.requestFullDiskRegistration = requestFullDiskRegistration;
