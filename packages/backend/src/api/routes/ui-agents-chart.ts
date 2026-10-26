/**
 * Agents chart choices (AGENTS-ORG-01 follow-up): List or Chart, how the
 * chart is arranged (who reports to whom / by department), the line style,
 * the zoom and which branches are folded. One value per person in
 * `user_prefs` (no migration); the page and the MCP tool use the same route.
 */
import type { FastifyInstance } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import { actorOrReply, requireAccount } from '../../repositories/scope.js';
import { getPref, setPref } from '../../repositories/user-prefs.js';

export interface ChartPrefs { view: 'list' | 'chart'; mode: 'reports' | 'departments'; lines: 'elbow' | 'curved' | 'straight'; zoom: number; folded: string[] }
const DEFAULTS: ChartPrefs = { view: 'list', mode: 'reports', lines: 'elbow', zoom: 1, folded: [] };
const KEYS = ['view', 'mode', 'lines', 'zoom', 'folded'];
const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const record = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const zoomOk = (z: unknown): z is number => typeof z === 'number' && Number.isFinite(z) && z >= 0.3 && z <= 1.6;
const foldedOk = (f: unknown): f is string[] => Array.isArray(f) && f.length <= 500 && f.every(x => typeof x === 'string' && AGENT_ID.test(x)) && new Set(f).size === f.length;

/** A change the route accepts: known keys and values only. */
export function chartChangeOk(x: unknown): x is Partial<ChartPrefs> {
  if (!record(x) || !Object.keys(x).length || !Object.keys(x).every(k => KEYS.includes(k))) return false;
  if ('view' in x && x.view !== 'list' && x.view !== 'chart') return false;
  if ('mode' in x && x.mode !== 'reports' && x.mode !== 'departments') return false;
  if ('lines' in x && !['elbow', 'curved', 'straight'].includes(x.lines as string)) return false;
  if ('zoom' in x && !zoomOk(x.zoom)) return false;
  return !('folded' in x) || foldedOk(x.folded);
}

/** Any saved value made whole (anything unknown falls back to the default). */
export function chartPrefs(x: unknown): ChartPrefs {
  const v = record(x) ? x : {};
  return {
    view: v.view === 'chart' ? 'chart' : 'list',
    mode: v.mode === 'departments' ? 'departments' : 'reports',
    lines: v.lines === 'curved' || v.lines === 'straight' ? v.lines : 'elbow',
    zoom: zoomOk(v.zoom) ? Math.round(v.zoom * 100) / 100 : DEFAULTS.zoom,
    folded: foldedOk(v.folded) ? v.folded : [],
  };
}

export async function uiAgentsChartRoutes(fastify: FastifyInstance) {
  fastify.get('/api/me/agents-chart', async (request, reply) => {
    const actor = actorOrReply(reply, actorOf(request), requireAccount);
    if (!actor) return reply;
    if (!actor.userId) return reply.code(403).send({ error: 'A signed-in account is required', code: 'forbidden' });
    return { chart: chartPrefs(await getPref(actor.userId, 'agents_chart')) };
  });
  fastify.put<{ Body: unknown }>('/api/me/agents-chart', async (request, reply) => {
    const actor = actorOrReply(reply, actorOf(request), requireAccount);
    if (!actor) return reply;
    if (!actor.userId) return reply.code(403).send({ error: 'A signed-in account is required', code: 'forbidden' });
    if (!chartChangeOk(request.body)) return reply.code(400).send({ error: 'Unknown chart setting', code: 'invalid' });
    const chart = chartPrefs({ ...chartPrefs(await getPref(actor.userId, 'agents_chart')), ...request.body });
    await setPref(actor.userId, 'agents_chart', chart);
    return { chart };
  });
}
