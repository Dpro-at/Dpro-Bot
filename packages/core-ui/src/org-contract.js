// Wire contract for the org chart and sub-agents (AGENTS-ORG-01), shared by the
// browser client (session.ts) and the local bridge (application-server.cjs).
//   PUT  /api/agents/:id/reports-to                    { reportsTo: id | null, expectedVersion? }
//   POST /api/agents/:id/sub-agents                    { name?, startsAs, specialtyId?, description?, tools, model?, provider? }
//   GET  /api/agents/:id/sub-agent-work
//   POST /api/agents/:id/sub-agent-work/:runId/stop
import { validAgentId } from './agent-id.js';

const record = x => typeof x === 'object' && x !== null && !Array.isArray(x);
const only = (b, keys) => Object.keys(b).every(k => keys.includes(k));
const text = (x, n) => typeof x === 'string' ? x.slice(0, n) : null;
const runId = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(x);
export const PLACED = ['main', 'set', 'auto', 'sub', 'none'];
export const ORG_CODES = ['main_fixed', 'sub_agent', 'not_movable', 'invalid_target', 'circle', 'version_conflict', 'not_found', 'invalid_tools', 'one_level', 'not_allowed', 'invalid_input', 'finished'];

/** The org fields GET /api/agents adds to each agent (anything else is dropped). */
export function orgFields(x) {
  const id = v => v === null || validAgentId(v);
  return {
    ...(id(x.reportsTo) ? { reportsTo: x.reportsTo } : {}),
    ...(id(x.subAgentOf) ? { subAgentOf: x.subAgentOf } : {}),
    ...(id(x.manager) ? { manager: x.manager } : {}),
    ...(PLACED.includes(x.placed) ? { placed: x.placed } : {}),
  };
}

export function orgPath(path) {
  const m = /^\/api\/agents\/([^/?#]+)\/(reports-to|sub-agents|sub-agent-work)(?:\/([^/?#]+)\/stop)?$/.exec(path);
  if (!m || !validAgentId(m[1])) return null;
  if (m[3] !== undefined) return m[2] === 'sub-agent-work' && runId(m[3]) ? { id: m[1], kind: 'stop', runId: m[3] } : null;
  return { id: m[1], kind: m[2] === 'reports-to' ? 'reports' : m[2] === 'sub-agents' ? 'add' : 'work' };
}
export function orgRoute(path) { return orgPath(path) !== null; }

const toolName = x => typeof x === 'string' && /^[A-Za-z0-9_:.-]{1,64}$/.test(x);
export function allowedOrg(method, path, body) {
  const p = orgPath(path);
  if (!p) return false;
  if (p.kind === 'reports') return method === 'PUT' && record(body) && only(body, ['reportsTo', 'expectedVersion']) && 'reportsTo' in body
    && (body.reportsTo === null || validAgentId(body.reportsTo)) && (body.expectedVersion === undefined || (Number.isSafeInteger(body.expectedVersion) && body.expectedVersion > 0));
  if (p.kind === 'work') return method === 'GET' && body === undefined;
  if (p.kind === 'stop') return method === 'POST' && body === undefined;
  return method === 'POST' && record(body) && only(body, ['name', 'startsAs', 'specialtyId', 'description', 'tools', 'model', 'provider'])
    && ['copy', 'specialty', 'empty'].includes(body.startsAs)
    && (body.name === undefined || (typeof body.name === 'string' && body.name.length <= 60))
    && (body.specialtyId === undefined || (typeof body.specialtyId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.specialtyId)))
    && (body.description === undefined || (typeof body.description === 'string' && body.description.length <= 1000))
    && Array.isArray(body.tools) && body.tools.length <= 200 && body.tools.every(toolName) && new Set(body.tools).size === body.tools.length
    && (body.model === undefined || (typeof body.model === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:\/-]{0,149}$/.test(body.model)))
    && (body.provider === undefined || (typeof body.provider === 'string' && /^[a-z][a-z-]{0,19}$/.test(body.provider)));
}

const STATUSES = ['running', 'waiting', 'finished', 'failed'];
/** Only the fields the pages use pass back; a known error code or nothing. */
export function orgResponse(path, status, body) {
  const p = orgPath(path);
  if (!p) throw Error('protocol');
  if (status === 200 || status === 201) {
    if (!record(body)) throw Error('protocol');
    if (p.kind === 'reports') {
      if (body.id !== p.id || !(body.reportsTo === null || validAgentId(body.reportsTo)) || !Number.isSafeInteger(body.version)) throw Error('protocol');
      return { id: body.id, reportsTo: body.reportsTo, version: body.version };
    }
    if (p.kind === 'add') {
      const a = body.agent;
      if (!record(a) || !validAgentId(a.id)) throw Error('protocol');
      return { agent: { id: a.id, name: text(a.name, 60), ...orgFields(a) } };
    }
    if (p.kind === 'stop') return { status: text(body.status, 20) };
    if (!Array.isArray(body.work) || body.work.length > 200) throw Error('protocol');
    return { work: body.work.filter(w => record(w) && runId(w.id) && STATUSES.includes(w.status)).map(w => ({
      id: w.id, kind: w.kind === 'quick' ? 'quick' : 'helper', agentId: validAgentId(w.agentId) ? w.agentId : null, status: w.status,
      summary: text(w.summary, 160), sessionId: typeof w.sessionId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(w.sessionId) ? w.sessionId : null,
      createdAt: typeof w.createdAt === 'string' && w.createdAt.length <= 40 ? w.createdAt : null })) };
  }
  const code = record(body) && ORG_CODES.includes(body.code) ? body.code : status === 404 ? 'not_found' : status === 403 ? 'forbidden' : status === 409 ? 'version_conflict' : 'unavailable';
  return { code, ...(record(body) && typeof body.error === 'string' && status === 400 && body.code === 'invalid_tools' ? { error: body.error.slice(0, 300) } : {}) };
}
