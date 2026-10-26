// Wire contract for Settings › Account › Signed in (my devices) and
// Settings › About and updates (the update check), shared by the browser
// client (session.ts) and the local bridge (application-server.cjs).

export const SESSIONS_PATH = '/api/auth/sessions';
export const UPDATES_PATH = '/api/system/updates';
export const UPDATES_CHECK_PATH = '/api/system/updates/check';
const SIGN_OUT = /^\/api\/auth\/sessions\/([a-f0-9]{24})\/sign-out$/;
const record = x => typeof x === 'object' && x !== null && !Array.isArray(x);
const time = x => Number.isSafeInteger(x) && x >= 0;
const name = x => typeof x === 'string' && /^[A-Za-z0-9._/-]{1,200}$/.test(x);
const count = x => x === null || (Number.isSafeInteger(x) && x >= 0 && x < 1e7);

/** A short device name worked out on this side; the raw browser text never leaves the bridge. */
export const DEVICE_LABEL_HEADER = 'x-dpro-device-label';
export function deviceLabel(userAgent) {
  const ua = typeof userAgent === 'string' ? userAgent.slice(0, 400) : '';
  const system = /iPhone|iPad/.test(ua) ? (ua.includes('iPad') ? 'iPad' : 'iPhone') : /Android/.test(ua) ? 'Android' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  const app = /Electron|Dpro/i.test(ua) ? 'Dpro app' : /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  if (!app && !system) return 'Unknown device';
  return app && system ? `${app} on ${system}` : app || system;
}
export function sessionsRoute(path) { return path === SESSIONS_PATH || SIGN_OUT.test(path); }
export function updatesRoute(path) { return path === UPDATES_PATH || path === UPDATES_CHECK_PATH; }
export function allowedAccountSettings(method, path, body) {
  if (path === SESSIONS_PATH || path === UPDATES_PATH) return method === 'GET' && body === undefined;
  if (SIGN_OUT.test(path) || path === UPDATES_CHECK_PATH) return method === 'POST' && body === undefined;
  return false;
}
/** Only the fields the pages show pass back; anything else becomes "unavailable". */
export function accountSettingsResponse(path, status, body) {
  if (status !== 200) return { code: record(body) && typeof body.code === 'string' && /^[a-z_]{1,40}$/.test(body.code) ? body.code : 'unavailable' };
  if (!record(body)) return { code: 'unavailable' };
  if (path === SESSIONS_PATH) {
    if (!Array.isArray(body.sessions) || body.sessions.length > 50) return { code: 'unavailable' };
    const sessions = body.sessions.filter(s => record(s) && /^[a-f0-9]{24}$/.test(s.id) && typeof s.label === 'string' && s.label.length <= 60 && time(s.createdAt) && time(s.lastSeenAt) && typeof s.current === 'boolean')
      .map(s => ({ id: s.id, label: s.label, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, current: s.current }));
    return { sessions };
  }
  if (SIGN_OUT.test(path)) return body.success === true ? { success: true } : { code: 'unavailable' };
  if (!['git', 'installed'].includes(body.kind) || typeof body.version !== 'string' || body.version.length > 40) return { code: 'unavailable' };
  const out = { kind: body.kind, version: body.version, branch: name(body.branch) ? body.branch : null, follows: name(body.follows) ? body.follows : null, behind: count(body.behind) ? body.behind : null, ahead: count(body.ahead) ? body.ahead : null, lookedAt: time(body.lookedAt) ? body.lookedAt : null, command: body.command === 'agent-player update' ? body.command : null };
  return path === UPDATES_CHECK_PATH ? { ...out, looked: body.looked === true } : out;
}
