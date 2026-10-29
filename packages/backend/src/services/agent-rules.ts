/**
 * Rules the owner's agents follow (RULES-01, Agents › Rules). Each rule is one
 * sentence in the owner's words, with where it applies (everywhere or one chat
 * project) and who follows it (all agents, departments, chosen agents). The
 * effective list for an agent in a project is added to its instructions before
 * every task: chat runs, hand-offs and coding apps alike.
 *
 * Order when rules meet: everywhere, then the project, then rules for chosen
 * agents; the later (narrower) one wins. Paused, suggested, dismissed and
 * deleted rules are never sent. Agents may only suggest a rule; the owner
 * accepts, changes or dismisses it.
 */
import { randomUUID } from 'node:crypto';
import { q } from '../repositories/sql-steps.js';

export type RuleWho = 'all' | 'departments' | 'agents';
export type RuleStatus = 'active' | 'suggested' | 'dismissed' | 'deleted';
export interface AgentRule {
  id: string; text: string; projectId: string | null; who: RuleWho; targets: string[]; paused: boolean;
  status: RuleStatus; source: 'owner' | 'agent'; suggestedBy: string | null; reason: string | null;
  version: number; createdAt: string; updatedAt: string;
}
export interface RuleVersion { version: number; text: string; projectId: string | null; who: RuleWho; targets: string[]; paused: boolean; changedAt: string }
interface Row { id: string; text: string; project_id: string | null; who: RuleWho; targets: string; paused: number; status: RuleStatus; source: 'owner' | 'agent'; suggested_by: string | null; reason: string | null; version: number; created_at: string; updated_at: string }

export class RuleInputError extends Error {}
export const RULE_CHARS = 2000;
export const REASON_CHARS = 500;
export const MAX_TARGETS = 50;
export const MAX_RULES = 300;
/** A deleted rule can be put back for this long (Undo). */
export const UNDO_MS = 10 * 60_000;
const WHO: readonly RuleWho[] = ['all', 'departments', 'agents'];

const list = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } };
const toRule = (r: Row): AgentRule => ({ id: r.id, text: r.text, projectId: r.project_id, who: r.who, targets: list(r.targets), paused: !!r.paused, status: r.status, source: r.source, suggestedBy: r.suggested_by, reason: r.reason, version: Number(r.version), createdAt: r.created_at, updatedAt: r.updated_at });
// eslint-disable-next-line no-control-regex
const clean = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();

export type RuleInput = { text: string; projectId: string | null; who: RuleWho; targets: string[]; paused: boolean };
/** Checks a full or partial rule; unknown keys and bad values are refused. */
export function checkRule(input: unknown, partial = false): Partial<RuleInput> {
  const v = input as Record<string, unknown> | null;
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new RuleInputError('A rule is { text, projectId, who, targets, paused }');
  const extra = Object.keys(v).filter((k) => !['text', 'projectId', 'who', 'targets', 'paused'].includes(k));
  if (extra.length) throw new RuleInputError(`Unknown field: ${extra[0]}`);
  const out: Partial<RuleInput> = {};
  if ('text' in v || !partial) {
    const text = typeof v.text === 'string' ? clean(v.text) : '';
    if (!text) throw new RuleInputError('Write the rule as a sentence');
    if ([...text].length > RULE_CHARS) throw new RuleInputError(`A rule is at most ${RULE_CHARS} characters`);
    out.text = text;
  }
  if ('projectId' in v) {
    if (v.projectId !== null && (typeof v.projectId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(v.projectId))) throw new RuleInputError('projectId is a project id or null (everywhere)');
    out.projectId = v.projectId as string | null;
  } else if (!partial) out.projectId = null;
  if ('who' in v) {
    if (!WHO.includes(v.who as RuleWho)) throw new RuleInputError('who is all, departments or agents');
    out.who = v.who as RuleWho;
  } else if (!partial) out.who = 'all';
  if ('targets' in v) {
    const t = v.targets;
    if (!Array.isArray(t) || t.length > MAX_TARGETS || !t.every((x) => typeof x === 'string' && x.trim() && x.length <= 120)) throw new RuleInputError(`targets is a list of at most ${MAX_TARGETS} names or ids`);
    out.targets = [...new Set(t.map((x: string) => x.trim()))];
  } else if (!partial) out.targets = [];
  if ('paused' in v) {
    if (typeof v.paused !== 'boolean') throw new RuleInputError('paused is true or false');
    out.paused = v.paused;
  } else if (!partial) out.paused = false;
  return out;
}
/** Departments are kept lowercase (like agents_config.department); all agents need no targets. */
function normalTargets(who: RuleWho, targets: string[]): string[] {
  if (who === 'all') return [];
  if (!targets.length) throw new RuleInputError(who === 'departments' ? 'Choose at least one department' : 'Choose at least one agent');
  return who === 'departments' ? [...new Set(targets.map((t) => t.toLowerCase()))] : targets;
}

async function projectExists(id: string | null | undefined): Promise<void> {
  if (!id) return;
  if (!(await q.one('SELECT id FROM chat_projects WHERE id = ?', id))) throw new RuleInputError('That project does not exist');
}

/** Creation time with milliseconds and a counter, so rules added in the same second keep their order. */
let last = 0;
const stamp = () => { const t = Math.max(Date.now(), last + 1); last = t; return new Date(t).toISOString(); };
const ORDER = "ORDER BY CASE WHEN who = 'agents' THEN 2 WHEN project_id IS NOT NULL THEN 1 ELSE 0 END, created_at, id";
/** Every rule the page shows (active and paused, then suggestions), in the order agents get them. */
export async function listRules(): Promise<{ rules: AgentRule[]; suggestions: AgentRule[] }> {
  const rows = await q.all<Row>(`SELECT * FROM agent_rules WHERE status IN ('active','suggested') ${ORDER}`);
  return { rules: rows.filter((r) => r.status === 'active').map(toRule), suggestions: rows.filter((r) => r.status === 'suggested').map(toRule) };
}
export async function getRule(id: string): Promise<AgentRule | null> {
  const r = await q.one<Row>('SELECT * FROM agent_rules WHERE id = ?', id);
  return r ? toRule(r) : null;
}

export async function createRule(input: unknown, by: string): Promise<AgentRule> {
  const v = checkRule(input) as RuleInput;
  await projectExists(v.projectId);
  const targets = normalTargets(v.who, v.targets);
  const n = await q.one<{ n: number }>("SELECT COUNT(*) AS n FROM agent_rules WHERE status IN ('active','suggested')");
  if (Number(n?.n) >= MAX_RULES) throw new RuleInputError(`At most ${MAX_RULES} rules`);
  const id = randomUUID();
  await q.run("INSERT INTO agent_rules(id,text,project_id,who,targets,paused,status,source,created_by,created_at) VALUES(?,?,?,?,?,?,'active','owner',?,?)", id, v.text, v.projectId, v.who, JSON.stringify(targets), v.paused ? 1 : 0, by, stamp());
  return (await getRule(id))!;
}

/** Changes a rule; the text before the change is kept as an earlier version. */
export async function editRule(id: string, input: unknown): Promise<AgentRule | null> {
  const cur = await q.one<Row>("SELECT * FROM agent_rules WHERE id = ? AND status IN ('active','suggested')", id);
  if (!cur) return null;
  const v = checkRule(input, true);
  if (v.projectId !== undefined) await projectExists(v.projectId);
  const who = v.who ?? cur.who;
  const targets = normalTargets(who, v.targets ?? (v.who && v.who !== cur.who ? [] : list(cur.targets)));
  const next = { text: v.text ?? cur.text, projectId: v.projectId !== undefined ? v.projectId : cur.project_id, who, targets: JSON.stringify(targets), paused: v.paused !== undefined ? (v.paused ? 1 : 0) : cur.paused };
  // Pausing or a rule nobody follows yet (a suggestion) keeps no version; a change of words or reach does.
  const changed = next.text !== cur.text || next.projectId !== cur.project_id || next.who !== cur.who || next.targets !== cur.targets;
  if (changed && cur.status === 'active') await q.run('INSERT INTO agent_rule_versions(rule_id,version,text,project_id,who,targets,paused) VALUES(?,?,?,?,?,?,?)', id, cur.version, cur.text, cur.project_id, cur.who, cur.targets, cur.paused);
  await q.run('UPDATE agent_rules SET text=?,project_id=?,who=?,targets=?,paused=?,version=version+?,updated_at=CURRENT_TIMESTAMP WHERE id=?', next.text, next.projectId, next.who, next.targets, next.paused, changed && cur.status === 'active' ? 1 : 0, id);
  return getRule(id);
}

export async function ruleVersions(id: string): Promise<RuleVersion[]> {
  const rows = await q.all<{ version: number; text: string; project_id: string | null; who: RuleWho; targets: string; paused: number; changed_at: string }>('SELECT * FROM agent_rule_versions WHERE rule_id = ? ORDER BY version DESC', id);
  return rows.map((r) => ({ version: Number(r.version), text: r.text, projectId: r.project_id, who: r.who, targets: list(r.targets), paused: !!r.paused, changedAt: r.changed_at }));
}
/** Puts an earlier version back (itself an edit, so the current text becomes a version too). */
export async function restoreVersion(id: string, version: number): Promise<AgentRule | null> {
  const v = await q.one<{ text: string; project_id: string | null; who: RuleWho; targets: string }>('SELECT text,project_id,who,targets FROM agent_rule_versions WHERE rule_id = ? AND version = ?', id, version);
  if (!v) return null;
  return editRule(id, { text: v.text, projectId: v.project_id && (await q.one('SELECT id FROM chat_projects WHERE id = ?', v.project_id)) ? v.project_id : null, who: v.who, targets: list(v.targets) });
}

/** Delete keeps the rule for Undo; agents stop getting it at once. */
export async function deleteRule(id: string): Promise<boolean> {
  return (await q.run("UPDATE agent_rules SET status='deleted',deleted_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'", new Date().toISOString(), id)).changes > 0;
}
export async function undoDelete(id: string): Promise<AgentRule | null> {
  const r = await q.one<{ deleted_at: string | null }>("SELECT deleted_at FROM agent_rules WHERE id = ? AND status = 'deleted'", id);
  if (!r?.deleted_at || Date.now() - Date.parse(r.deleted_at) > UNDO_MS) return null;
  await q.run("UPDATE agent_rules SET status='active',deleted_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?", id);
  return getRule(id);
}

/** An agent suggests a rule; it waits for the owner and is never sent before it is accepted. */
export async function suggestRule(input: unknown, agentId: string | null, reason: unknown): Promise<AgentRule> {
  const v = checkRule(input) as RuleInput;
  await projectExists(v.projectId);
  const targets = normalTargets(v.who, v.targets);
  const why = typeof reason === 'string' ? [...clean(reason)].slice(0, REASON_CHARS).join('') : '';
  const open = await q.one<{ n: number }>("SELECT COUNT(*) AS n FROM agent_rules WHERE status = 'suggested'");
  if (Number(open?.n) >= 20) throw new RuleInputError('20 suggestions already wait for the owner');
  const same = await q.one<Row>("SELECT * FROM agent_rules WHERE status IN ('active','suggested') AND text = ?", v.text);
  if (same) return toRule(same);
  const id = randomUUID();
  await q.run("INSERT INTO agent_rules(id,text,project_id,who,targets,paused,status,source,suggested_by,reason,created_at) VALUES(?,?,?,?,?,0,'suggested','agent',?,?,?)", id, v.text, v.projectId, v.who, JSON.stringify(targets), agentId, why || null, stamp());
  return (await getRule(id))!;
}
/** The owner decides a suggestion: use it (optionally changed first) or dismiss it. */
export async function decideSuggestion(id: string, use: boolean): Promise<AgentRule | null> {
  const r = await q.run(`UPDATE agent_rules SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='suggested'`, use ? 'active' : 'dismissed', id);
  return r.changes ? getRule(id) : null;
}

/** "Our usual rules": the working rules the owner already uses, added paused so they are read first. */
export const STARTER_RULES: readonly string[] = [
  'Chat with me in Arabic; write code, comments and docs in English.',
  'When you take a task, write a handoff note when you stop: what is done, what is left, what comes next.',
  'Never name a competitor in anything public.',
  'Ask before you install software, delete files or data, or contact an outside service.',
  'Every screen change starts as a design board; build it after my OK.',
  'Commit only on a feature branch, never on main, and never push without my OK.',
];
export async function addStarterRules(by: string): Promise<AgentRule[]> {
  const out: AgentRule[] = [];
  for (const text of STARTER_RULES) {
    if (await q.one("SELECT id FROM agent_rules WHERE status IN ('active','suggested') AND text = ?", text)) continue;
    out.push(await createRule({ text, paused: true }, by));
  }
  return out;
}

/** Does this rule reach this agent in this project? */
export function ruleApplies(r: Pick<AgentRule, 'projectId' | 'who' | 'targets'>, agent: { id: string; department: string | null }, projectId: string | null): boolean {
  if (r.projectId && r.projectId !== projectId) return false;
  if (r.who === 'agents') return r.targets.includes(agent.id);
  if (r.who === 'departments') return !!agent.department && r.targets.includes(agent.department.toLowerCase());
  return true;
}
/** The rules an agent gets in a project, in order (the later one wins). Paused rules are left out. */
export async function effectiveRules(agentId: string, projectId: string | null): Promise<AgentRule[]> {
  const agent = await q.one<{ id: string; department: string | null }>('SELECT id, department FROM agents_config WHERE id = ?', agentId);
  if (!agent) return [];
  const rows = await q.all<Row>(`SELECT * FROM agent_rules WHERE status = 'active' AND paused = 0 ${ORDER}`);
  return rows.map(toRule).filter((r) => ruleApplies(r, agent, projectId));
}
/** The project a chat belongs to (NULL = none). */
export async function sessionProject(sessionId: string | null | undefined): Promise<string | null> {
  if (!sessionId) return null;
  return (await q.one<{ project_id: string | null }>('SELECT project_id FROM chat_sessions WHERE id = ?', sessionId).catch(() => undefined))?.project_id ?? null;
}
/** The instruction block for an agent's run, or '' when no rule reaches it. */
export async function rulesContext(agentId: string, opts: { sessionId?: string | null; projectId?: string | null } = {}): Promise<string> {
  const projectId = opts.projectId !== undefined ? opts.projectId : await sessionProject(opts.sessionId);
  const rules = await effectiveRules(agentId, projectId).catch(() => []);
  if (!rules.length) return '';
  return 'The owner set these rules for how you work. Follow them in every task. When two disagree, the later one wins. They do not grant tools, permissions or access.\n'
    + rules.map((r, i) => `${i + 1}. ${r.text}`).join('\n');
}
