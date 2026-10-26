/**
 * Org chart and sub-agents (AGENTS-ORG-01).
 *
 * Who reports to whom:
 *  - agents_config.reports_to (migration 144) is the owner's choice; empty
 *    means Dpro places the agent: a manager under the main agent, anyone else
 *    under the manager of its department, else under the main agent.
 *  - The main agent reports to nobody. A sub-agent always sits under the
 *    agent it belongs to (agent_grant_profiles.parent_agent_id, migration 053)
 *    and cannot be moved to someone else.
 *  - Only the owner changes it; circles are refused. The reserved small local
 *    agent is never part of the chart.
 *
 * Sub-agents: a helper that belongs to one agent. Its tools are always a part
 * of its agent's (checked by tools/grants.ts on every load), only its agent
 * gives it work, and it cannot have sub-agents of its own (one level).
 *
 * Removing an agent (repositories/agents-config.ts deleteConfig) moves the
 * agents that report to it up to its own manager and removes its sub-agents.
 */

import { all, dialect, one, run, sql, type Step } from '../repositories/sql-steps.js';
import { nowText } from '../db/pg/dialect.js';
import { getEncryptionService } from '../credentials/encryption.js';
import { redactSecrets } from './secret-redact.js';
import { isoUtc } from '../api/timestamps.js';

export interface OrgRow {
  id: string;
  name?: string;
  role: string | null;
  department: string | null;
  is_primary: number;
  reports_to: string | null;
  created_at: string;
  parent_agent_id: string | null;
}

/** How an agent got its place: the main agent, set by the owner, placed by Dpro, a sub-agent, or outside the chart. */
export type Placed = 'main' | 'set' | 'auto' | 'sub' | 'none';
export interface Placement { manager: string | null; placed: Placed }

/** repositories/agents-config.ts RESERVED_AGENT_ID (not imported: that module imports this one). */
const RESERVED_AGENT_ID = 'small-local-agent';

export class OrgError extends Error {
  constructor(readonly status: 400 | 403 | 404, readonly code: string, message: string) { super(message); }
}

export function* orgRowsStep(): Step<OrgRow[]> {
  return yield* all<OrgRow>(`SELECT a.id, a.name, a.role, a.department, a.is_primary, a.reports_to, a.created_at, p.parent_agent_id
    FROM agents_config a LEFT JOIN agent_grant_profiles p ON p.agent_id = a.id ORDER BY a.created_at ASC, a.id ASC`);
}
export const orgRows = () => sql().read(orgRowsStep());

/** Every agent's manager in the chart (pure; the same rule for the API, MCP and deletes). */
export function placeAgents(rows: readonly OrgRow[]): Map<string, Placement> {
  const byId = new Map(rows.map(r => [r.id, r]));
  // The main agent: the primary one; with none marked, the oldest agent (the same rule team delegation always used).
  const main = (rows.find(r => r.is_primary === 1 && r.id !== RESERVED_AGENT_ID) ?? rows.find(r => r.id !== RESERVED_AGENT_ID && !r.parent_agent_id))?.id ?? null;
  const isSub = (r: OrgRow | undefined) => !!r?.parent_agent_id && byId.has(r.parent_agent_id) && r.parent_agent_id !== r.id;
  const inChart = (id: string | null | undefined) => !!id && byId.has(id) && id !== RESERVED_AGENT_ID;
  const out = new Map<string, Placement>();
  for (const r of rows) {
    if (r.id === RESERVED_AGENT_ID) { out.set(r.id, { manager: null, placed: 'none' }); continue; }
    if (r.id === main) { out.set(r.id, { manager: null, placed: 'main' }); continue; }
    if (isSub(r)) { out.set(r.id, { manager: r.parent_agent_id, placed: 'sub' }); continue; }
    const target = r.reports_to;
    if (inChart(target) && target !== r.id && !isSub(byId.get(target!))) { out.set(r.id, { manager: target, placed: 'set' }); continue; }
    out.set(r.id, { manager: autoManager(r, rows, main, isSub), placed: 'auto' });
  }
  // A circle (only possible through stale data) is broken by hanging the agent under the main agent.
  for (const r of rows) {
    const seen = new Set<string>([r.id]);
    let cursor = out.get(r.id)?.manager ?? null;
    while (cursor) {
      if (seen.has(cursor)) { out.set(r.id, { manager: r.id === main ? null : main, placed: 'auto' }); break; }
      seen.add(cursor);
      cursor = out.get(cursor)?.manager ?? null;
    }
  }
  return out;
}

function autoManager(r: OrgRow, rows: readonly OrgRow[], main: string | null, isSub: (r: OrgRow | undefined) => boolean): string | null {
  if (r.role !== 'manager' && r.department) {
    const lead = rows.find(x => x.id !== r.id && x.role === 'manager' && x.department === r.department && !isSub(x) && x.id !== RESERVED_AGENT_ID && x.id !== main);
    if (lead) return lead.id;
  }
  return main;
}

/** The agents under `id` (any depth), sub-agents included. */
export function under(id: string, placement: Map<string, Placement>): Set<string> {
  const below = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [agent, p] of placement) if (p.manager && (p.manager === id || below.has(p.manager)) && !below.has(agent)) { below.add(agent); grew = true; }
  }
  return below;
}

/** The fields GET /api/agents adds to each agent. */
export function orgFields(rows: readonly OrgRow[]): Map<string, { reportsTo: string | null; subAgentOf: string | null; manager: string | null; placed: Placed }> {
  const placement = placeAgents(rows);
  return new Map(rows.map(r => {
    const p = placement.get(r.id)!;
    return [r.id, { reportsTo: r.reports_to ?? null, subAgentOf: p.placed === 'sub' ? r.parent_agent_id : null, manager: p.manager, placed: p.placed }];
  }));
}

/**
 * Change who an agent reports to (owner only). `reportsTo` null or '' hands
 * the place back to Dpro. Returns the new agents_config version.
 */
export async function setReportsTo(id: string, input: unknown): Promise<{ id: string; reportsTo: string | null; version: number }> {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null;
  if (!body || Object.keys(body).some(k => k !== 'reportsTo' && k !== 'expectedVersion')) throw new OrgError(400, 'invalid_input', 'reportsTo is required');
  if (!('reportsTo' in body)) throw new OrgError(400, 'invalid_input', 'reportsTo is required');
  const target = body.reportsTo === null || body.reportsTo === '' ? null : body.reportsTo;
  if (target !== null && (typeof target !== 'string' || target.length > 128)) throw new OrgError(400, 'invalid_input', 'reportsTo must be an agent id or null');
  const expected = body.expectedVersion;
  if (expected !== undefined && expected !== null && (!Number.isSafeInteger(expected) || (expected as number) < 1)) throw new OrgError(400, 'invalid_version', 'expectedVersion must be a positive integer');
  return sql().tx(function* () {
    const rows = yield* orgRowsStep();
    const me = rows.find(r => r.id === id);
    if (!me) throw new OrgError(404, 'not_found', 'Agent not found');
    const placement = placeAgents(rows);
    const mine = placement.get(id)!;
    if (mine.placed === 'none') throw new OrgError(400, 'not_movable', 'The small local agent is not part of the chart');
    if (mine.placed === 'main') throw new OrgError(400, 'main_fixed', 'The main agent always stays on top');
    if (mine.placed === 'sub') throw new OrgError(400, 'sub_agent', 'A sub-agent stays under the agent it belongs to');
    if (target !== null) {
      const t = placement.get(target as string);
      if (!t || target === id || t.placed === 'none') throw new OrgError(400, 'invalid_target', 'Choose another agent of the team');
      if (t.placed === 'sub') throw new OrgError(400, 'invalid_target', 'A sub-agent cannot have people under it');
      if (under(id, placement).has(target as string)) throw new OrgError(400, 'circle', 'That agent is under this one');
    }
    const d = yield* dialect();
    const r = yield* run(`UPDATE agents_config SET reports_to = ?, updated_at = ${nowText(d)} WHERE id = ?${expected ? ' AND version = ?' : ''}`,
      target as string | null, id, ...(expected ? [expected as number] : []));
    if (r.changes === 0) throw new OrgError(400, 'version_conflict', 'The agent was changed by someone else; reload it and try again');
    const now = yield* one<{ version: number }>('SELECT version FROM agents_config WHERE id = ?', id);
    return { id, reportsTo: target as string | null, version: now?.version ?? 1 };
  });
}

/**
 * Inside the delete transaction: the agents that report to `id` move up to
 * its manager; its sub-agents are returned so the caller removes them too.
 */
export function* releaseReportsStep(id: string): Step<{ subAgents: string[] }> {
  const rows = yield* orgRowsStep();
  const placement = placeAgents(rows);
  const up = placement.get(id)?.manager ?? null;
  const d = yield* dialect();
  for (const r of rows) {
    if (r.reports_to === id) yield* run(`UPDATE agents_config SET reports_to = ?, updated_at = ${nowText(d)} WHERE id = ?`, up, r.id);
  }
  return { subAgents: rows.filter(r => r.parent_agent_id === id && r.id !== id).map(r => r.id) };
}

/** May `coordinator` give work to `target`? The main agent: anyone but other agents' sub-agents; anyone else: the people under it and its own sub-agents. */
export function mayDelegate(coordinator: string, target: string, rows: readonly OrgRow[]): boolean {
  if (coordinator === target || target === RESERVED_AGENT_ID) return false;
  const placement = placeAgents(rows);
  const c = placement.get(coordinator), t = placement.get(target);
  if (!c || !t || c.placed === 'sub' || c.placed === 'none') return false;
  if (t.placed === 'sub') return t.manager === coordinator;
  if (c.placed === 'main') return true;
  return under(coordinator, placement).has(target);
}

export interface SubAgentWork {
  id: string; kind: 'helper' | 'quick'; agentId: string | null; status: 'running' | 'waiting' | 'finished' | 'failed';
  summary: string | null; sessionId: string | null; createdAt: string | null;
}

const firstLine = (text: string) => {
  const line = redactSecrets(text).text.split('\n').map(s => s.trim()).find(Boolean) ?? '';
  return line.length > 140 ? line.slice(0, 139) + '…' : line;
};

/** Work an agent gave to its sub-agents and quick helpers (owner only, newest first, at most 30 days). */
export async function subAgentWork(ownerId: string, agentId: string): Promise<SubAgentWork[]> {
  const teamRows = await sql().read(all<{ id: string; agent_id: string; status: string; session_id: string; created_at: string; result_encrypted: string | null; result_iv: string | null; result_tag: string | null }>(
    `SELECT t.id, t.agent_id, t.status, t.session_id, t.created_at, t.result_encrypted, t.result_iv, t.result_tag
       FROM team_delegation_results t JOIN agent_grant_profiles p ON p.agent_id = t.agent_id AND p.parent_agent_id = t.coordinator_id
      WHERE t.owner_id = ? AND t.coordinator_id = ? ORDER BY t.created_at DESC, t.id DESC LIMIT 50`, ownerId, agentId));
  const out: SubAgentWork[] = [];
  for (const r of teamRows) {
    let summary: string | null = null;
    if (r.result_encrypted && r.result_iv && r.result_tag) {
      try {
        const res = JSON.parse(await getEncryptionService().decrypt(r.result_encrypted, r.result_iv, r.result_tag)) as { content?: Array<{ type: string; text?: string }> };
        const text = (res.content ?? []).filter(c => c.type === 'text' && typeof c.text === 'string').map(c => c.text).join('\n');
        if (text) summary = firstLine(text);
      } catch { summary = null; }
    }
    out.push({ id: r.id, kind: 'helper', agentId: r.agent_id, sessionId: r.session_id, createdAt: isoUtc(r.created_at),
      status: r.status === 'started' ? 'running' : r.status === 'waiting_approval' ? 'waiting' : r.status === 'answered' ? 'finished' : 'failed', summary });
  }
  const quick = await sql().read(all<{ id: string; status: string; kind: string; output_preview: string | null; status_reason: string | null; created_at: string }>(
    `SELECT r.id, r.status, s.kind, r.output_preview, r.status_reason, r.created_at FROM small_agent_runs s JOIN task_runs r ON r.id = s.run_id
      WHERE s.requested_by = ? ORDER BY r.created_at DESC, r.id DESC LIMIT 50`, quickHelperRequester(agentId)));
  for (const r of quick) {
    const status = ['queued', 'running'].includes(r.status) ? 'running' : r.status === 'waiting_approval' ? 'waiting' : r.status === 'completed' ? 'finished' : 'failed';
    const text = r.output_preview ?? (status === 'failed' ? r.status_reason : null);
    out.push({ id: r.id, kind: 'quick', agentId: null, status, summary: text ? firstLine(text) : null, sessionId: null, createdAt: isoUtc(r.created_at) });
  }
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  return out.filter(w => !w.createdAt || Date.parse(w.createdAt) >= cutoff).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 60);
}

/** small_agent_runs.requested_by for a run an agent started (a coding app's run keeps the owner id). */
export const quickHelperRequester = (agentId: string) => `agent:${agentId}`;

const ROLE_WORD: Record<string, string> = { main: 'main agent', manager: 'manager', specialist: 'specialist', evaluator: 'reviewer' };
/**
 * A few lines for the agent's instructions: who it reports to, who is under
 * it and its sub-agents (names only). It grants nothing: giving work still
 * needs the team tools, their grant and the owner's Allow.
 */
export async function teamContext(agentId: string): Promise<string> {
  const rows = await orgRows();
  const placement = placeAgents(rows);
  const me = placement.get(agentId);
  if (!me || me.placed === 'none') return '';
  // Names are data: one line, no control characters, at most 60 characters, quoted.
  const clean = (v: string) => JSON.stringify(v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60));
  const name = (id: string | null) => { const r = rows.find(x => x.id === id); return r ? `${clean(r.name ?? r.id)}${r.role && ROLE_WORD[r.role] ? ` (${ROLE_WORD[r.role]})` : ''}` : ''; };
  if (me.placed === 'sub') return `You are a sub-agent of ${name(me.manager)}. You work only on what it gives you and you cannot hand work on to anyone.`;
  const lines: string[] = [];
  lines.push(me.placed === 'main' ? 'You are the main agent: everyone in the team works under you.' : `You report to ${name(me.manager)}.`);
  const direct = rows.filter(r => placement.get(r.id)?.manager === agentId && placement.get(r.id)?.placed !== 'sub').map(r => name(r.id));
  const subs = rows.filter(r => placement.get(r.id)?.manager === agentId && placement.get(r.id)?.placed === 'sub').map(r => name(r.id));
  if (direct.length && me.placed !== 'main') lines.push(`Agents under you: ${direct.slice(0, 20).join(', ')}${direct.length > 20 ? ` and ${direct.length - 20} more` : ''}.`);
  if (subs.length) lines.push(`Your sub-agents (they work only for you): ${subs.join(', ')}.`);
  if (direct.length || subs.length) lines.push('When you have the team tools, give each one clear task with what "done" means, and check its report before you tell the owner it is done.');
  return lines.join('\n');
}
