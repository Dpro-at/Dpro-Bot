// Wire contract for the Agents chart choices (one value per person), shared by
// the browser client (session.ts) and the local bridge (application-server.cjs).
export const CHART_PREFS_PATH = '/api/me/agents-chart';
export const DEFAULT_CHART = Object.freeze({ view: 'list', mode: 'reports', lines: 'elbow', zoom: 1, folded: [] });
const record = x => typeof x === 'object' && x !== null && !Array.isArray(x);
const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const zoomOk = z => typeof z === 'number' && Number.isFinite(z) && z >= 0.3 && z <= 1.6;
const foldedOk = f => Array.isArray(f) && f.length <= 500 && f.every(x => typeof x === 'string' && AGENT_ID.test(x)) && new Set(f).size === f.length;
export function chartChangeOk(x) {
  if (!record(x) || !Object.keys(x).length || !Object.keys(x).every(k => ['view', 'mode', 'lines', 'zoom', 'folded'].includes(k))) return false;
  if ('view' in x && !['list', 'chart'].includes(x.view)) return false;
  if ('mode' in x && !['reports', 'departments'].includes(x.mode)) return false;
  if ('lines' in x && !['elbow', 'curved', 'straight'].includes(x.lines)) return false;
  if ('zoom' in x && !zoomOk(x.zoom)) return false;
  return !('folded' in x) || foldedOk(x.folded);
}
export function chartPrefs(x) {
  const v = record(x) ? x : {};
  return { view: v.view === 'chart' ? 'chart' : 'list', mode: v.mode === 'departments' ? 'departments' : 'reports', lines: ['curved', 'straight'].includes(v.lines) ? v.lines : 'elbow', zoom: zoomOk(v.zoom) ? v.zoom : 1, folded: foldedOk(v.folded) ? [...v.folded] : [] };
}
export function chartPrefsRoute(path) { return path === CHART_PREFS_PATH; }
export function allowedChartPrefs(method, path, body) { return chartPrefsRoute(path) && ((method === 'GET' && body === undefined) || (method === 'PUT' && chartChangeOk(body))); }
export function chartPrefsResponse(status, body) {
  if (status === 200) { if (!record(body) || !record(body.chart)) throw Error('protocol'); return { chart: chartPrefs(body.chart) }; }
  return { code: status === 400 ? 'invalid' : status === 403 ? 'forbidden' : 'unavailable' };
}
