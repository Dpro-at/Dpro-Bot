'use strict';
/**
 * Desktop app settings: run Girru on this computer ("local", default) or open
 * an existing Girru elsewhere ("remote"). Stored as <userData>/desktop.json (0600).
 *
 * A remote address must be https, or plain http only on this computer
 * (127.0.0.1 / localhost / ::1, e.g. an SSH tunnel). No user name, password,
 * query or fragment in the address; it is kept as its origin.
 */
const fs = require('node:fs');
const path = require('node:path');

const FILE = 'desktop.json';
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);
const DEFAULTS = Object.freeze({ mode: 'local', remoteUrl: null });

/** The origin of a valid remote address, or null. */
function remoteOrigin(input) {
  if (typeof input !== 'string' || input.length > 2048) return null;
  let url;
  try { url = new URL(input.trim()); } catch { return null; }
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  if (url.protocol === 'https:') return url.origin;
  if (url.protocol === 'http:' && LOOPBACK.has(url.hostname)) return url.origin;
  return null;
}

function normalize(value) {
  if (!value || typeof value !== 'object') return { ...DEFAULTS };
  const origin = remoteOrigin(value.remoteUrl);
  if (value.mode === 'remote' && origin) return { mode: 'remote', remoteUrl: origin };
  return { mode: 'local', remoteUrl: origin };
}

function loadSettings(dir) {
  try { return normalize(JSON.parse(fs.readFileSync(path.join(dir, FILE), 'utf8'))); }
  catch { return { ...DEFAULTS }; }
}

function saveSettings(dir, value) {
  const clean = normalize(value);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(clean)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  return clean;
}

module.exports = { remoteOrigin, loadSettings, saveSettings, normalize, FILE };
