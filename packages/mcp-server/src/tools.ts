/**
 * The MCP tools and the result-card rendering.
 *
 *   spawn_small_agent  { task, kind?, tools?, drawers?, max_steps?, read_dir? } -> run id (+ what was granted)
 *   get_result         { run_id, wait_seconds? }                     -> result card
 *   list_runs          { status?, limit? }                           -> runs + capacity (queue length)
 *   list_handoffs      { agent_id?, kind?, project_id?, limit? }     -> newest handoff note of every chat / board task
 *   read_handoff       { kind, scope_id, agent_id }                  -> the note + its history
 *   edit_handoff       { kind, scope_id, agent_id, done?, left?, next?, questions? } -> a new version
 *                      (source "owner"); the agent's next session starts from it
 *
 * The handoff tools use the owner-only /api/handoffs routes (CORE-MEM-HANDOFF):
 * a session that is not the owner account gets 403, like the small-agent tools.
 *
 * Every tool returns a short Markdown text for the model to read, the same
 * data as JSON text, and `structuredContent` (the JSON object).
 */

import { BackendError, type BackendClient } from './backend.js';

export const KINDS = ['lookup', 'summary', 'classification', 'draft', 'other'] as const;
export const HANDOFF_KINDS = ['conversation', 'task'] as const;
const HANDOFF_SCOPE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const AGENT_ID = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
const handoffList = (what: string) => ({ type: 'array', maxItems: 8, items: { type: 'string', maxLength: 300 }, description: `${what} (up to 8 short lines; replaces the list)` });
export const STATUSES = ['queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled'] as const;
const FINAL = new Set(['completed', 'failed', 'cancelled', 'waiting_approval']);
const RUN_ID = /^[0-9a-f-]{36}$/i;

const FOOTER_IDS=['chat','agents','board','memory','approvals','apps','genvr','terminal','code','skills','personalities','specialties','mcp'];

export const TOOL_DEFINITIONS = [
  {
    name:'workspace_settings',title:'Portable workspace settings',
    description:'Owner-session only. Export selected agents, personalities, specialties and Markdown skills, or preview a supplied JSON pack. Keys, accounts, conversations and memories are excluded. Import requires the owner’s explicit instruction after reviewing the preview, its fingerprint and confirmed=true. Imports copies with safe permissions; retry the same file after an uncertain result. Never automatically import or share a file externally.',
    inputSchema:{type:'object',properties:{operation:{type:'string',enum:['export','preview','import']},body:{type:'object'}},required:['operation','body'],additionalProperties:false},
  },
  {
    name:'trading_practice',title:'Local paper trading practice',
    description:'Owner-session only. Read/start/end an isolated in-memory practice session, place a fictional buy/sell, run one manual practice bot step, or stop that bot. Fixed fictional prices and virtual money only; no provider, saved account or background trading. A write requires the owner’s explicit instruction. Reuse requestId when retrying an uncertain order or step.',
    inputSchema:{type:'object',properties:{operation:{type:'string',enum:['read','start','order','step','stop','end']},sessionId:{type:'string',maxLength:36},requestId:{type:'string',maxLength:36},symbol:{type:'string',enum:['DEMO-ALPHA','DEMO-BETA','DEMO-GAMMA']},side:{type:'string',enum:['buy','sell']},quantity:{type:'integer',minimum:1,maximum:100}},required:['operation'],additionalProperties:false},
  },

  {
    name:'workspace_apps',title:'Workspace applications',
    description:'Owner-session only. List Apps, add an MCP connection disabled, or turn one off. Writes require the owner’s explicit instruction. Adding does not execute a program or grant tools. Program startup, account linking, secrets and permanent removal are reviewed by the owner in the app.',
    inputSchema:{type:'object',properties:{operation:{type:'string',enum:['list','add','disable']},id:{type:'string',maxLength:36},connection:{type:'object',properties:{name:{type:'string',maxLength:24},description:{type:'string',maxLength:500},transport:{type:'string',enum:['http','sse','stdio']},url:{type:'string',maxLength:2000},command:{type:'string',maxLength:500},args:{type:'array',maxItems:50,items:{type:'string',maxLength:1000}},allowRemote:{type:'boolean'}},additionalProperties:false}},required:['operation'],additionalProperties:false},
  },

  {
    name:'workspace_footer',title:'Footer sections',
    description:'Owner-session only. Read or change which sections the Dpro window footer shows, their order, icons only, and whether Approvals comes back when something waits. Sections: chat, agents, board, memory, approvals, apps, genvr, terminal, code, skills, personalities, specialties, mcp. Settings always stays and cannot be hidden; hidden sections stay in the command box (⌘K). Change only when the owner asks. The open window picks the change up when it is next focused.',
    inputSchema:{type:'object',properties:{operation:{type:'string',enum:['read','set']},order:{type:'array',maxItems:13,items:{type:'string',enum:FOOTER_IDS}},hidden:{type:'array',maxItems:13,items:{type:'string',enum:FOOTER_IDS}},iconsOnly:{type:'boolean'},approvalsWhenWaiting:{type:'boolean'}},required:['operation'],additionalProperties:false},
  },
  {
    name:'personality_library', title:'Personality library',
    description:'Owner-session only. Read profiles, team balance, versions and manual exams; create or edit, preview linked changes, assign, archive or mix personalities. A write requires the owner’s explicit instruction. A linked change (one that updates other agents) can only be previewed here; the owner confirms it in the app. Approving drift and unlocking are owner-only in the app. Personality grants no tools or permissions. Use operation read/list/team/versions/exams/save/preview/assign/archive/blend/assess. For save supply revision and profile in body.',
    inputSchema:{type:'object',properties:{operation:{type:'string',enum:['list','read','team','versions','exams','save','preview','assign','archive','blend','assess','try','assignment','tune','mode','agentCurrent','agentVersions','lock','unlock','restore','proposals','proposal','approve','reject']},id:{type:'string',maxLength:128},proposalId:{type:'string',maxLength:36},body:{type:'object'}},required:['operation'],additionalProperties:false},
  },

  {
    name:'specialty_library', title:'Specialty library',
    description:'Owner-session only. The jobs (specialties) agents can have. Read: list, read, catalogue (skills and tools a job may ask for), agents (who has it and their real access), assigned (one agent\'s specialties), impact. Write only on the owner\'s explicit instruction: save a draft (body = name, department, description, instructions, config, revision; revision 0 with a new uuid id makes a new specialty), preview the change, hire a new agent linked to it (body: templateId, revision, requestId, name?, libraryPersonality?, confirmed=true after the owner checked the job; reuse requestId when retrying so only one agent is made). Giving a specialty to existing agents or taking it back, a save that updates agents who already have the job ("Update N agents"), and consent to sensitive actions are done by the owner in the app. Specialties never grant tools or permissions.',
    inputSchema:{type:'object',properties:{operation:{type:'string',enum:['list','read','catalogue','agents','assigned','impact','preview','save','hire']},id:{type:'string',maxLength:36},agentId:{type:'string',maxLength:128},body:{type:'object'}},required:['operation'],additionalProperties:false},
  },

  {
    name: 'spawn_small_agent',
    title: 'Delegate a light task to the small local agent',
    description: [
      'Hand ONE light, self-contained task to the Dpro Bot small local agent (local Qwen model; free, private, slower and less capable than you).',
      'Good for: lookups in Dpro Bot memory/storage, summaries of text you pass in, classification/tagging, first drafts.',
      'Not for: code changes, security decisions, anything that sends, pays, deletes, installs or runs commands (the small agent has no such tools), or tasks needing deep reasoning.',
      'Returns a run id at once; fetch the result card with get_result. Outputs marked needs_review must be checked by you before use.',
      'The small agent only gets read-only tools (memory_search, storage_search, read, memory_graph) and only the memory drawers you name; delegation never adds permissions.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', minLength: 1, maxLength: 8000, description: 'The complete task, with all text the agent needs (it cannot see your context).' },
        kind: { type: 'string', enum: [...KINDS], description: 'lookup | summary | classification are informational; draft and other always need review. Default other.' },
        tools: {
          type: 'array', maxItems: 20, items: { type: 'string' },
          description: 'Tools the agent may use; only memory_search, storage_search, read and memory_graph (people/projects/links in memory) can be granted. Default: memory_search + storage_search.',
        },
        drawers: {
          type: 'array', maxItems: 14, items: { type: 'string' },
          description: 'Memory drawers to open, e.g. "owner", "experience", "project:alpha", "task:<id>", "people:<id>". Default: none (no memory).',
        },
        max_steps: { type: 'integer', minimum: 1, maximum: 100, description: 'Step budget (model + tool calls). Default and upper limit 15.' },
        read_dir: {
          type: 'string', maxLength: 1024,
          description: 'Absolute directory the "read" tool may read (only with tools including "read"; must be inside a folder the owner allowed with SMALL_AGENT_READ_ROOTS on the backend, otherwise refused; never the Dpro Bot backend, data, config or credential folders; .env, keys, tokens and databases stay blocked). Default: the small agent\'s own workspace.',
        },
      },
      required: ['task'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_result',
    title: 'Result card of a small-agent run',
    description: 'Get the result card of a small-agent run: status, summary, outputs, steps used, duration, model, needs_review and warnings. Optionally wait up to 60 s for it to finish.',
    inputSchema: {
      type: 'object',
      properties: {
        run_id: { type: 'string', description: 'Run id returned by spawn_small_agent.' },
        wait_seconds: { type: 'integer', minimum: 0, maximum: 60, description: 'Wait up to this many seconds for the run to finish (default 0).' },
      },
      required: ['run_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_runs',
    title: 'List small-agent runs and capacity',
    description: 'List recent small-agent runs and the current capacity (active, running, queued, waiting, limit, free slots). New spawns are refused while all slots are busy.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: [...STATUSES] },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Default 20.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_handoffs',
    title: 'List agent handoff notes',
    description: 'Owner only. The newest done / left / next note of every chat and board task, per agent, newest first. Read one in full with read_handoff.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', maxLength: 128, description: 'Only this agent\'s notes.' },
        kind: { type: 'string', enum: [...HANDOFF_KINDS], description: 'conversation (a saved chat) or task (a board task).' },
        project_id: { type: 'string', maxLength: 128, description: 'Only notes of chats in this chat project.' },
        limit: { type: 'integer', minimum: 1, maximum: 200, description: 'Default 50.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'read_handoff',
    title: 'Read one handoff note and its history',
    description: 'Owner only. The current handoff note of one agent for one chat or board task, with every earlier version.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: [...HANDOFF_KINDS] },
        scope_id: { type: 'string', maxLength: 128, description: 'The conversation id or the board task id.' },
        agent_id: { type: 'string', maxLength: 128 },
      },
      required: ['kind', 'scope_id', 'agent_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'edit_handoff',
    title: 'Edit a handoff note (as the owner)',
    description: 'Owner only. Save a corrected done / left / next note for one agent in one chat or board task. It is kept as a new version (the old one stays in the history) and the agent\'s next session starts from it. Lists you leave out stay as they are; never put keys, passwords or tokens in a note.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: [...HANDOFF_KINDS] },
        scope_id: { type: 'string', maxLength: 128 },
        agent_id: { type: 'string', maxLength: 128 },
        done: handoffList('What is finished'),
        left: handoffList('What is still open'),
        next: handoffList('The next steps'),
        questions: handoffList('Open questions for the owner'),
      },
      required: ['kind', 'scope_id', 'agent_id'],
      additionalProperties: false,
    },
  },
] as const;

export interface ToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

class InputError extends Error {}

function ok(markdown: string, data: Record<string, unknown>): ToolCallResult {
  return { content: [{ type: 'text', text: markdown }, { type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

function fail(message: string, data?: Record<string, unknown>): ToolCallResult {
  return { content: [{ type: 'text', text: message }], ...(data ? { structuredContent: data } : {}), isError: true };
}

function obj(args: unknown): Record<string, unknown> {
  if (args === undefined || args === null) return {};
  if (typeof args !== 'object' || Array.isArray(args)) throw new InputError('arguments must be an object');
  return args as Record<string, unknown>;
}

function only(args: Record<string, unknown>, allowed: string[]) {
  for (const k of Object.keys(args)) if (!allowed.includes(k)) throw new InputError(`unknown argument "${k}"`);
}

function intIn(v: unknown, name: string, min: number, max: number): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new InputError(`${name} must be an integer from ${min} to ${max}`);
  return v;
}

function strList(v: unknown, name: string, max: number): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || v.length > max || !v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 200)) {
    throw new InputError(`${name} must be a list of at most ${max} names`);
  }
  return v as string[];
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const ms = (n: unknown) => (typeof n === 'number' ? (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`) : '?');

export function renderCard(card: any): string {
  const lines = [
    `### Small agent: ${card.status}${card.needs_review ? ' (needs review)' : ''}`,
    '',
    `**Summary:** ${card.summary || '(none)'}`,
    '',
    `- run: \`${card.run_id}\` (${card.kind})`,
    `- model: ${card.model}`,
    `- steps: ${card.steps_used}/${card.max_steps}, time: ${ms(card.duration_ms)} of ${ms(card.max_duration_ms)}`,
    `- tools granted: ${card.tools_granted?.length ? card.tools_granted.join(', ') : 'none'}; used: ${card.tools_used?.length ? card.tools_used.join(', ') : 'none'}`,
    `- memory drawers: ${card.drawers?.length ? card.drawers.join(', ') : 'none'}`,
    ...(card.read_dir ? [`- read directory: ${card.read_dir}`] : []),
    `- needs_review: ${card.needs_review}${card.review_reason ? ` (${card.review_reason})` : ''}`,
  ];
  if (card.warnings?.length) {
    lines.push('', '**Warnings:**', ...card.warnings.map((w: string) => `- ${w}`));
  }
  if (card.outputs?.length) {
    lines.push('', '**Output:**', '', ...card.outputs.map((o: any) => String(o.text ?? '')));
  }
  if (card.needs_review) {
    lines.push('', '_Check this output before you rely on it or pass it on._');
  }
  return lines.join('\n');
}

function capacityLine(c: any): string {
  return `capacity: ${c.active}/${c.limit} active (running ${c.running}, queued ${c.queued}, waiting ${c.waiting}), ${c.available} free`;
}

function renderList(runs: any[], capacity: any): string {
  const lines = [`### Small-agent runs`, '', capacityLine(capacity), ''];
  if (!runs.length) lines.push('No runs.');
  for (const r of runs) {
    lines.push(`- \`${r.run_id}\` ${r.status} (${r.kind}), steps ${r.steps_used}/${r.max_steps}, created ${r.created_at}${r.summary ? `: ${r.summary}` : ''}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const sleep = (n: number) => new Promise((r) => setTimeout(r, n));

export interface HandlerDeps { backend: BackendClient; pollMs?: number }

export async function callTool(name: string, rawArgs: unknown, deps: HandlerDeps): Promise<ToolCallResult> {
  try {
    const args = obj(rawArgs);
    switch (name) {
      case 'workspace_settings': return await workspaceSettingsTool(args,deps);
      case 'trading_practice': return await tradingPracticeTool(args,deps);
      case 'workspace_apps': return await workspaceAppsTool(args,deps);
      case 'workspace_footer': return await workspaceFooterTool(args,deps);
      case 'personality_library': return await personalityLibraryTool(args,deps);
      case 'specialty_library': return await specialtyLibraryTool(args,deps);
      case 'spawn_small_agent': return await spawn(args, deps);
      case 'get_result': return await getResult(args, deps);
      case 'list_runs': return await list(args, deps);
      case 'list_handoffs': return await listHandoffs(args, deps);
      case 'read_handoff': return await readHandoff(args, deps);
      case 'edit_handoff': return await editHandoff(args, deps);
      default: return fail(`Unknown tool "${name}"`);
    }
  } catch (err) {
    if (err instanceof InputError) return fail(`Invalid arguments: ${err.message}`);
    if (err instanceof BackendError) {
      if (err.status === 429 && err.data?.capacity) {
        return fail(`The small agent is busy (${capacityLine(err.data.capacity)}). Do the task yourself or try again after a run finishes.`, { refused: 'capacity', capacity: err.data.capacity });
      }
      return fail(err.message);
    }
    return fail('Unexpected error in the Dpro Bot MCP server.');
  }
}

async function spawn(args: Record<string, unknown>, { backend }: HandlerDeps): Promise<ToolCallResult> {
  only(args, ['task', 'kind', 'tools', 'drawers', 'max_steps', 'read_dir']);
  if (typeof args.task !== 'string' || !args.task.trim() || args.task.length > 8000) throw new InputError('task must be a non-empty string of at most 8000 characters');
  if (args.kind !== undefined && !(KINDS as readonly unknown[]).includes(args.kind)) throw new InputError(`kind must be one of ${KINDS.join(', ')}`);
  const body: Record<string, unknown> = { task: args.task };
  if (args.kind !== undefined) body.kind = args.kind;
  const tools = strList(args.tools, 'tools', 20);
  if (tools) body.tools = tools;
  const drawers = strList(args.drawers, 'drawers', 14);
  if (drawers) body.drawers = drawers;
  const maxSteps = intIn(args.max_steps, 'max_steps', 1, 100);
  if (maxSteps !== undefined) body.max_steps = maxSteps;
  if (args.read_dir !== undefined) {
    if (typeof args.read_dir !== 'string' || !args.read_dir.trim() || args.read_dir.length > 1024) throw new InputError('read_dir must be an absolute directory path');
    body.read_dir = args.read_dir;
  }

  const res = await backend.request('POST', '/api/small-agent/runs', body);
  const data = {
    run_id: res.run_id,
    status: res.status,
    kind: res.kind,
    granted_tools: res.granted_tools ?? [],
    drawers: res.drawers ?? [],
    read_dir: res.read_dir ?? null,
    budget: res.budget,
    model: res.model,
    warnings: res.warnings ?? [],
    capacity: res.capacity,
  };
  const md = [
    `Small agent started: run \`${data.run_id}\` (${data.kind}, model ${data.model}).`,
    `Tools: ${data.granted_tools.length ? data.granted_tools.join(', ') : 'none'}; drawers: ${data.drawers.length ? data.drawers.join(', ') : 'none'}; budget ${data.budget?.max_steps} steps / ${ms(data.budget?.max_duration_ms)}.`,
    ...(data.warnings.length ? ['Warnings:', ...data.warnings.map((w: string) => `- ${w}`)] : []),
    `Call get_result with run_id "${data.run_id}" (wait_seconds up to 60) for the result card.`,
  ].join('\n');
  return ok(md, data);
}

async function getResult(args: Record<string, unknown>, { backend, pollMs = 1000 }: HandlerDeps): Promise<ToolCallResult> {
  only(args, ['run_id', 'wait_seconds']);
  if (typeof args.run_id !== 'string' || !RUN_ID.test(args.run_id)) throw new InputError('run_id must be a run id from spawn_small_agent');
  const wait = intIn(args.wait_seconds, 'wait_seconds', 0, 60) ?? 0;
  const end = Date.now() + wait * 1000;
  let card: any;
  for (;;) {
    card = (await backend.request('GET', `/api/small-agent/runs/${encodeURIComponent(args.run_id)}`)).card;
    if (FINAL.has(card?.status) || Date.now() >= end) break;
    await sleep(Math.min(pollMs, Math.max(0, end - Date.now())));
  }
  return ok(renderCard(card), card);
}

async function list(args: Record<string, unknown>, { backend }: HandlerDeps): Promise<ToolCallResult> {
  only(args, ['status', 'limit']);
  if (args.status !== undefined && !(STATUSES as readonly unknown[]).includes(args.status)) throw new InputError(`status must be one of ${STATUSES.join(', ')}`);
  const limit = intIn(args.limit, 'limit', 1, 100);
  const q = new URLSearchParams();
  if (args.status) q.set('status', String(args.status));
  if (limit) q.set('limit', String(limit));
  const qs = q.toString();
  const res = await backend.request('GET', `/api/small-agent/runs${qs ? `?${qs}` : ''}`);
  const capacity = { ...res.capacity, queue_length: (res.capacity?.queued ?? 0) + (res.capacity?.waiting ?? 0) };
  const data = { runs: res.runs ?? [], capacity };
  return ok(renderList(data.runs, capacity), data);
}

// ---------------------------------------------------------------------------
// Handoff notes (owner only)
// ---------------------------------------------------------------------------

function handoffTarget(args: Record<string, unknown>): { kind: string; scopeId: string; agentId: string } {
  if (!(HANDOFF_KINDS as readonly unknown[]).includes(args.kind)) throw new InputError(`kind must be one of ${HANDOFF_KINDS.join(', ')}`);
  if (typeof args.scope_id !== 'string' || !HANDOFF_SCOPE.test(args.scope_id)) throw new InputError('scope_id must be a conversation or board task id');
  if (typeof args.agent_id !== 'string' || !AGENT_ID.test(args.agent_id)) throw new InputError('agent_id must be an agent id');
  return { kind: args.kind as string, scopeId: args.scope_id, agentId: args.agent_id };
}

const handoffPath = (t: { kind: string; scopeId: string }) => `/api/handoffs/${encodeURIComponent(t.kind)}/${encodeURIComponent(t.scopeId)}`;

function renderHandoff(h: any): string {
  if (!h) return 'No handoff note yet.';
  const section = (title: string, items: unknown) => (Array.isArray(items) && items.length ? [`**${title}:**`, ...items.map((i) => `- ${String(i)}`)] : []);
  return [
    `### Handoff: ${h.agentName ?? h.agentId} — ${h.kind} \`${h.scopeId}\` (version ${h.version}, ${h.source}, ${h.createdAt})`,
    ...section('Done', h.done), ...section('Left', h.left), ...section('Next', h.next), ...section('Open questions', h.questions),
  ].join('\n');
}

async function listHandoffs(args: Record<string, unknown>, { backend }: HandlerDeps): Promise<ToolCallResult> {
  only(args, ['agent_id', 'kind', 'project_id', 'limit']);
  if (args.agent_id !== undefined && (typeof args.agent_id !== 'string' || !AGENT_ID.test(args.agent_id))) throw new InputError('agent_id must be an agent id');
  if (args.project_id !== undefined && (typeof args.project_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(args.project_id))) throw new InputError('project_id must be a chat project id');
  if (args.kind !== undefined && !(HANDOFF_KINDS as readonly unknown[]).includes(args.kind)) throw new InputError(`kind must be one of ${HANDOFF_KINDS.join(', ')}`);
  const limit = intIn(args.limit, 'limit', 1, 200);
  const q = new URLSearchParams();
  if (args.agent_id) q.set('agentId', String(args.agent_id));
  if (args.kind) q.set('kind', String(args.kind));
  if (args.project_id) q.set('projectId', String(args.project_id));
  if (limit) q.set('limit', String(limit));
  const qs = q.toString();
  const res = await backend.request('GET', `/api/handoffs${qs ? `?${qs}` : ''}`);
  const handoffs = Array.isArray(res?.handoffs) ? res.handoffs : [];
  const md = handoffs.length
    ? ['### Handoff notes', '', ...handoffs.map((h: any) => `- ${h.agentName ?? h.agentId} — ${h.kind} ${h.title ? `"${h.title}" ` : ''}\`${h.scopeId}\` v${h.version} (${h.createdAt}): ${Array.isArray(h.next) && h.next.length ? `next: ${h.next[0]}` : `${(h.done ?? []).length} done, ${(h.left ?? []).length} left`}`)].join('\n')
    : 'No handoff notes yet.';
  return ok(md, { handoffs });
}

async function readHandoff(args: Record<string, unknown>, { backend }: HandlerDeps): Promise<ToolCallResult> {
  only(args, ['kind', 'scope_id', 'agent_id']);
  const t = handoffTarget(args);
  const res = await backend.request('GET', `${handoffPath(t)}?agentId=${encodeURIComponent(t.agentId)}`);
  const history = Array.isArray(res?.history) ? res.history : [];
  return ok([renderHandoff(res?.handoff ?? null), ...(history.length > 1 ? ['', `${history.length - 1} earlier version(s).`] : [])].join('\n'), { handoff: res?.handoff ?? null, history });
}

async function editHandoff(args: Record<string, unknown>, { backend }: HandlerDeps): Promise<ToolCallResult> {
  only(args, ['kind', 'scope_id', 'agent_id', 'done', 'left', 'next', 'questions']);
  const t = handoffTarget(args);
  const body: Record<string, unknown> = { agentId: t.agentId };
  for (const k of ['done', 'left', 'next', 'questions'] as const) {
    if (args[k] === undefined) continue;
    const v = args[k];
    if (!Array.isArray(v) || v.length > 8 || !v.every((x) => typeof x === 'string' && x.length <= 300)) throw new InputError(`${k} must be a list of at most 8 short lines`);
    body[k] = v;
  }
  if (Object.keys(body).length === 1) throw new InputError('give at least one of done, left, next, questions');
  // Lists left out keep their current text.
  const current = (await backend.request('GET', `${handoffPath(t)}?agentId=${encodeURIComponent(t.agentId)}`))?.handoff;
  for (const k of ['done', 'left', 'next', 'questions'] as const) if (body[k] === undefined && Array.isArray(current?.[k])) body[k] = current[k];
  const res = await backend.request('PUT', handoffPath(t), body);
  return ok(`Saved as version ${res?.handoff?.version ?? '?'}. The agent's next session starts from it.\n\n${renderHandoff(res?.handoff)}`, { handoff: res?.handoff ?? null });
}

async function personalityLibraryTool(args:Record<string,unknown>,{backend}:HandlerDeps):Promise<ToolCallResult>{
 only(args,['operation','id','proposalId','body']);
 const operation=args.operation;
 if(typeof operation!=='string')throw new InputError('operation is required');
 const base='/api/personality-library';
 const routes:Record<string,{method:'GET'|'POST'|'PUT';suffix:string;id?:boolean}>={list:{method:'GET',suffix:''},team:{method:'GET',suffix:'/team'},read:{method:'GET',suffix:'',id:true},versions:{method:'GET',suffix:'/versions',id:true},exams:{method:'GET',suffix:'/exams',id:true},save:{method:'PUT',suffix:'',id:true},preview:{method:'POST',suffix:'/preview',id:true},archive:{method:'POST',suffix:'/archive',id:true},blend:{method:'POST',suffix:'/blend'},assess:{method:'POST',suffix:'/exams',id:true},assignment:{method:'GET',suffix:'',id:true},mode:{method:'POST',suffix:'/mode',id:true},tune:{method:'POST',suffix:'/tune',id:true},agentCurrent:{method:'GET',suffix:'/personality/current',id:true},agentVersions:{method:'GET',suffix:'/personality/versions',id:true},lock:{method:'POST',suffix:'/personality/lock',id:true},unlock:{method:'POST',suffix:'/personality/unlock',id:true},proposals:{method:'GET',suffix:'/personality/proposals',id:true},proposal:{method:'GET',suffix:'/personality/proposals',id:true},approve:{method:'POST',suffix:'/personality/proposals',id:true},reject:{method:'POST',suffix:'/personality/proposals',id:true},restore:{method:'POST',suffix:'/personality/rollback',id:true},assign:{method:'POST',suffix:'',id:true},try:{method:'POST',suffix:'/try',id:true}};
 const route=routes[operation];if(!Object.hasOwn(routes,operation)||!route)throw new InputError('Unknown operation');
 if(route.id&&(typeof args.id!=='string'||!(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/).test(args.id)))throw new InputError('Valid id required');
 if(route.method==='GET'&&args.body!==undefined)throw new InputError('Read operations do not accept a body');
 // Owner review stays in the app: an MCP caller may preview a linked change but never confirm it, approve drift or lift a lock.
 if(operation==='approve'||operation==='unlock')throw new InputError('Approving drift and unlocking are done by the owner in the app');
 if(args.body&&typeof args.body==='object'&&Object.hasOwn(args.body,'confirmation'))throw new InputError('Linked changes are confirmed by the owner in the app; use preview to show the impact');
 const agentOperation=['agentCurrent','agentVersions','lock','unlock','restore','proposals','proposal','approve','reject'].includes(operation);
 const proposalOperation=['proposal','approve','reject'].includes(operation);
 if(proposalOperation&&(typeof args.proposalId!=='string'||!(/^[a-f0-9-]{36}$/).test(args.proposalId)))throw new InputError('A valid proposalId is required');
 const url=(agentOperation?'/api/agents':base)+(['assign','assignment','tune','mode'].includes(operation)?'/assigned/':'/')+(route.id?args.id:'')+route.suffix+(proposalOperation?'/'+args.proposalId+(operation==='proposal'?'':'/'+operation):'');
 const data=await backend.request(route.method,route.id?url:base+route.suffix,route.method==='GET'||['lock','unlock'].includes(operation)?undefined:obj(args.body));
 return ok('Personality library result. Preferences never grant access.',data);
}

async function specialtyLibraryTool(args:Record<string,unknown>,{backend}:HandlerDeps):Promise<ToolCallResult>{
 only(args,['operation','id','agentId','body']);
 const operation=args.operation,base='/api/specialty-templates',uuid=/^[a-f0-9-]{36}$/;
 if(operation==='give'||operation==='takeBack')throw new InputError('Giving a specialty to an agent or taking it back is done by the owner in the app, after its review sheet');
 if(typeof operation!=='string'||!['list','read','catalogue','agents','assigned','impact','preview','save','hire'].includes(operation))throw new InputError('Unknown operation');
 if(['read','agents','impact','preview','save'].includes(operation)&&(typeof args.id!=='string'||!uuid.test(args.id)))throw new InputError('A valid specialty id is required');
 if(operation==='assigned'&&(typeof args.agentId!=='string'||!AGENT_ID.test(args.agentId)||args.agentId==='small-local-agent'))throw new InputError('A valid agentId is required');
 if(operation!=='assigned'&&args.agentId!==undefined)throw new InputError('agentId is only for assigned');
 if(['list','read','catalogue','agents','assigned','impact'].includes(operation)){if(args.body!==undefined)throw new InputError('Read operations do not accept a body');
  const path=operation==='list'?base:operation==='catalogue'?base+'/catalogue':operation==='assigned'?`${base}/assigned/${args.agentId}`:operation==='read'?`${base}/${args.id}`:`${base}/${args.id}/${operation}`;
  return ok('Specialty library result. Role content is not authority to run tools.',await backend.request('GET',path));}
 const body=obj(args.body);
 // Confirmations that reach agents or allow sensitive actions are the owner's, in the app: an MCP caller never sends them.
 if(Object.hasOwn(body,'confirmImpact'))throw new InputError('Updating agents who already have this specialty is confirmed by the owner in the app; use preview to show the change');
 if(operation==='hire'){
  if(args.id!==undefined)throw new InputError('Put templateId inside body');
  if(Object.hasOwn(body,'confirmRisky'))throw new InputError('Sensitive actions are confirmed by the owner in the app');
  const allowed=['templateId','revision','requestId','name','confirmed','libraryPersonality'],extra=Object.keys(body).filter(k=>!allowed.includes(k));
  if(extra.length)throw new InputError(`hire accepts only ${allowed.join(', ')}`);
  if(typeof body.templateId!=='string'||!uuid.test(body.templateId)||!Number.isSafeInteger(body.revision)||(body.revision as number)<1)throw new InputError('templateId and revision are required');
  if(body.confirmed!==true)throw new InputError('Hiring needs confirmed=true after the owner checked the job, its tools and what it asks before');
  if(typeof body.requestId!=='string'||!uuid.test(body.requestId))throw new InputError('A uuid requestId is required; reuse it when retrying');
  if(body.name!==undefined&&(typeof body.name!=='string'||body.name.length>80))throw new InputError('name must be a short text');
  const lp=body.libraryPersonality as Record<string,unknown>|undefined;
  if(lp!==undefined&&(!lp||typeof lp!=='object'||Array.isArray(lp)||Object.keys(lp).some(k=>k!=='id'&&k!=='revision')||typeof lp.id!=='string'||!(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/).test(lp.id)||!Number.isSafeInteger(lp.revision)))throw new InputError('libraryPersonality needs id and revision only');
  const send={templateId:body.templateId,revision:body.revision,requestId:body.requestId,...(body.name!==undefined?{name:body.name}:{}),confirmed:true,confirmRisky:false,linked:true,...(lp?{libraryPersonality:{id:lp.id,revision:lp.revision}}:{})};
  return ok('Agent hired with this specialty, linked to it. It gets the instructions and skills, no tools, no extra memory and no sensitive-action consent by itself.',await backend.request('POST',base+'/hire',send));}
 const data=await backend.request(operation==='save'?'PUT':'POST',operation==='save'?`${base}/${args.id}`:`${base}/${args.id}/preview`,body);
 return ok(operation==='save'?'Specialty saved. No tool or memory permission changed.':'Preview only: nothing changed. The owner confirms an update for agents in the app.',data);
}

async function workspaceFooterTool(args:Record<string,unknown>,{backend}:HandlerDeps):Promise<ToolCallResult>{
 only(args,['operation','order','hidden','iconsOnly','approvalsWhenWaiting']);
 if(args.operation==='read'){only(args,['operation']);return ok('Footer sections. Settings always stays.',await backend.request('GET','/api/me/footer'));}
 if(args.operation!=='set')throw new InputError('operation must be read or set');
 const change:Record<string,unknown>={};
 for(const k of ['order','hidden'] as const)if(k in args){const v=args[k];if(!Array.isArray(v)||v.length>FOOTER_IDS.length||!v.every(x=>typeof x==='string'&&FOOTER_IDS.includes(x))||new Set(v).size!==v.length)throw new InputError(`${k} must list known sections once each`);change[k]=v;}
 for(const k of ['iconsOnly','approvalsWhenWaiting'] as const)if(k in args){if(typeof args[k]!=='boolean')throw new InputError(`${k} must be true or false`);change[k]=args[k];}
 if(!Object.keys(change).length)throw new InputError('Nothing to change');
 return ok('Footer changed. Settings always stays; hidden sections stay in ⌘K.',await backend.request('PUT','/api/me/footer',change));
}

async function workspaceAppsTool(args:Record<string,unknown>,{backend}:HandlerDeps):Promise<ToolCallResult>{
 only(args,['operation','id','connection']);
 if(args.operation==='list'){
  only(args,['operation']);
  return ok('Applications. Reading this list does not connect or grant access.',await backend.request('GET','/api/apps'));
 }
 if(args.operation==='disable'){
  only(args,['operation','id']);
  if(typeof args.id!=='string'||!(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/).test(args.id))throw new InputError('A valid connection id is required');
  await backend.request('POST','/api/mcp/servers/'+args.id+'/disable');
  return ok('Connection turned off.',await backend.request('GET','/api/apps'));
 }
 if(args.operation==='add'){
  only(args,['operation','connection']);
  const input=obj(args.connection);only(input,['name','description','transport','url','command','args','allowRemote']);
  if(typeof input.name!=='string'||!(/^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/).test(input.name)||!['http','sse','stdio'].includes(String(input.transport)))throw new InputError('A valid name and transport are required');
  if(input.description!==undefined&&(typeof input.description!=='string'||input.description.length>500)||input.allowRemote!==undefined&&typeof input.allowRemote!=='boolean')throw new InputError('Invalid connection');
  if(input.transport==='stdio'){
   if(typeof input.command!=='string'||!input.command.trim()||input.command.length>500||input.url!==undefined||input.allowRemote!==undefined)throw new InputError('Invalid program connection');
   if(input.args!==undefined&&(!Array.isArray(input.args)||input.args.length>50||!input.args.every(v=>typeof v==='string'&&v.length<=1000)))throw new InputError('Invalid arguments');
  }else if(typeof input.url!=='string'||!input.url||input.url.length>2000||input.command!==undefined||input.args!==undefined)throw new InputError('Invalid web connection');
  const saved=await backend.request('POST','/api/mcp/servers',input);
  return ok('Connection added disabled. The owner reviews startup and agent access in the app.',{id:saved.id});
 }
 throw new InputError('Unknown application operation');
}

async function workspaceSettingsTool(args:Record<string,unknown>,{backend}:HandlerDeps):Promise<ToolCallResult>{
 only(args,['operation','body']);
 const operation=args.operation,body=obj(args.body);
 if(!['export','preview','import'].includes(String(operation)))throw new InputError('Unknown settings operation');
 if(operation==='export'){
  only(body,['agents','personalities','specialties','skills']);
  if(Object.keys(body).length!==4||!Object.values(body).every(v=>typeof v==='boolean')||!Object.values(body).some(Boolean))throw new InputError('Choose settings to export');
 }else{
  only(body,operation==='preview'?['pack']:['pack','fingerprint','confirmed']);
  const pack=obj(body.pack);
  if(pack.format!=='dpro-workspace-pack'||pack.version!==1||JSON.stringify(body).length>2_100_000)throw new InputError('A supported settings pack is required');
  if(operation==='import'&&(body.confirmed!==true||typeof body.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(body.fingerprint)))throw new InputError('Review the preview and explicitly confirm its fingerprint');
 }
 return ok('Workspace settings result. Import preserves existing settings and does not grant tools.',await backend.request('POST','/api/workspace-pack/'+operation,body));
}

async function tradingPracticeTool(args:Record<string,unknown>,{backend}:HandlerDeps):Promise<ToolCallResult>{
 const operation=args.operation,base='/api/trading-paper/practice';
 if(operation==='read'||operation==='start'){
  only(args,['operation']);return ok('Local fictional practice.',await backend.request(operation==='read'?'GET':'POST',base,operation==='start'?{}:undefined));
 }
 if(!['order','step','stop','end'].includes(String(operation)))throw new InputError('Unknown practice operation');
 const fields=operation==='order'?['sessionId','requestId','symbol','side','quantity']:operation==='step'?['sessionId','requestId']:['sessionId'];
 only(args,['operation',...fields]);
 const uuid=(v:unknown)=>typeof v==='string'&&(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/).test(v);
 if(!uuid(args.sessionId)||['order','step'].includes(String(operation))&&!uuid(args.requestId))throw new InputError('Valid session and request identifiers are required');
 if(operation==='order'&&(!['DEMO-ALPHA','DEMO-BETA','DEMO-GAMMA'].includes(String(args.symbol))||!['buy','sell'].includes(String(args.side))||!Number.isSafeInteger(args.quantity)||Number(args.quantity)<1||Number(args.quantity)>100))throw new InputError('Invalid fictional order');
 const suffix=operation==='order'?'/orders':operation==='step'?'/step':operation==='stop'?'/stop-bot':'/end';
 return ok('Fictional practice result. Saved paper accounts and live trading are separate.',await backend.request('POST',base+suffix,Object.fromEntries(fields.map(k=>[k,args[k]]))));
}
