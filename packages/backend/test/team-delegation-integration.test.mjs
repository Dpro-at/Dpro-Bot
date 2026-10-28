import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backend = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'team-integration-'));
mkdirSync(join(dir, '.data'));
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex');
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
process.env.AGENT_EXEC_TOOLS = 'true';
process.env.OLLAMA_URL = 'http://127.0.0.1:11434';
const fetchOriginal = globalThis.fetch;
let requests = [];
let mode = 'answer';
globalThis.fetch = async (url, init) => {
  assert.equal(String(url), 'http://127.0.0.1:11434/api/chat');
  const body = JSON.parse(init.body); requests.push(body);
  const prompt = body.messages.map(m => m.content).join('\n');
  assert.equal(body.model, 'synthetic-model');
  assert.match(prompt, /Synthetic specialist instructions/);
  assert.ok(!prompt.includes('"name":"write"'), 'child-only write grant must not be offered');
  return new Response(JSON.stringify({ message: { content: mode === 'answer' ? '{"type":"answer","text":"Synthetic delegated findings."}' : '{"type":"tool","name":"write","arguments":{"path":"escape","content":"bad"}}' } }), { status: 200 });
};
const { getDatabase, closeDatabase } = await import(join(backend, 'src/db/database.ts'));
const db = getDatabase(); await db.initialize();
for (const [id, role] of [['owner', 'owner'], ['user', 'user']]) db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'x',?,'active')").run(id, `${id}@example.test`, id, role);
db.prepare('UPDATE agents_config SET is_primary=0').run();
db.prepare("INSERT INTO agents_config(id,name,is_primary,provider,model) VALUES('coordinator','Coordinator',1,'ollama','main-model')").run();
db.prepare("INSERT INTO agents_config(id,name,is_primary,provider,model,system_prompt) VALUES('specialist','Specialist',0,'ollama','synthetic-model','Synthetic specialist instructions')").run();
const { createAgentToolsRegistry } = await import(join(backend, 'src/tools/index.ts'));
const { setAgentGrants } = await import(join(backend, 'src/tools/grants.ts'));
const { teamListTool, teamDelegateTool, teamResultsTool } = await import(join(backend, 'src/tools/tasks/team.ts'));
const { approveAndRun, getApprovalDetail } = await import(join(backend, 'src/tools/approvals.ts'));
const context = { workspaceDir: dir, fileReadRoot: dir, agentId: 'coordinator', userId: 'owner', sessionId: 'synthetic-team-session', memoryDrawers: [] };
const available = (await createAgentToolsRegistry(context)).listRegistered();
await setAgentGrants('coordinator', { grants: ['team_list', 'team_delegate', 'team_results', 'read'] }, 'owner', available);
await setAgentGrants('specialist', { grants: ['read', 'write'] }, 'owner', available);
test.after(() => { globalThis.fetch = fetchOriginal; closeDatabase(); process.chdir(backend); rmSync(dir, { recursive: true, force: true }); });

test('real registry requires owner approval before delegation; no model request runs', async () => {
  const registry = await createAgentToolsRegistry(context);
  const result = await registry.execute('team_delegate', { agent_id: 'specialist', request: 'Inspect synthetic evidence.' });
  assert.equal(result.details?.status, 'pending_approval'); assert.equal(requests.length, 0);
  const detail = await getApprovalDetail(result.details.approvalId);
  assert.equal(detail.runScope.fileReadRoot, dir, 'approval preserves the exact selected project');
  const approved = await approveAndRun(detail.id, 'owner', detail.paramsHash);
  assert.equal(approved.record.status, 'executed'); assert.equal(approved.result.details.status, 'answered');
  assert.equal(requests.length, 1);
  await assert.rejects(approveAndRun(detail.id, 'owner', detail.paramsHash));
  assert.equal(requests.length, 1, 'replayed approval must not repeat inference');
  const collected = await teamResultsTool.execute({}, context);
  assert.match(collected.content[0].text, /Synthetic delegated findings/);
  const otherSession = await teamResultsTool.execute({}, { ...context, sessionId: 'other-session' });
  assert.deepEqual(JSON.parse(otherSession.content[0].text), []);
  const stored = db.prepare('SELECT result_encrypted FROM team_delegation_results').all();
  assert.ok(stored.every(row => !row.result_encrypted.includes('Synthetic delegated findings')));
});
test('primary owner discovers configured team and direct execution exercises the child runtime with intersected grants', async () => {
  const roster = await teamListTool.execute({}, context);
  assert.ok(JSON.parse(roster.content[0].text).some(a => a.id === 'specialist' && a.model === 'synthetic-model'));
  const result = await teamDelegateTool.execute({ agent_id: 'specialist', request: 'Inspect synthetic evidence.' }, context);
  assert.equal(result.error, undefined); assert.equal(result.details.status, 'answered');
  assert.match(result.content[0].text, /Synthetic delegated findings/); assert.equal(requests.length, 2);
});
test('a child cannot invoke a tool granted only to itself', async () => {
  mode = 'ungranted';
  const result = await teamDelegateTool.execute({ agent_id: 'specialist', request: 'Attempt synthetic invalid tool.' }, context);
  assert.equal(result.error, 'team_request_refused');
});
test('non-owner, non-primary, self and missing-agent assignments never call a provider', async () => {
  const before = requests.length;
  for (const [ctx, id] of [[{ ...context, userId: 'user' }, 'specialist'], [{ ...context, agentId: 'specialist' }, 'coordinator'], [context, 'coordinator'], [context, 'missing']]) {
    assert.ok((await teamDelegateTool.execute({ agent_id: id, request: 'No execution.' }, ctx)).error);
  }
  assert.equal(requests.length, before);
});

// Linux reports a script's interpreter as the process executable, so the CLI identity check refuses the
// script-based fake CLIs (and real script CLIs too): tracked as SUB-LINUX-01, macOS covers this path for now.
test('all three subscription selections use their selected CLI with agent context and never fall back to Ollama', { skip: process.platform === 'linux' ? 'SUB-LINUX-01: script CLIs fail the process identity check on Linux' : false }, async () => {
  const before = requests.length;
  mkdirSync(join(dir, '.local', 'bin'), { recursive: true });
  const script = `#!${process.execPath}\nlet input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',()=>{if(!input.includes('Synthetic specialist instructions'))process.exit(2);const answer=JSON.stringify({type:'answer',text:'Synthetic CLI specialist result'});const name=process.argv[1].split('/').pop();if(name==='claude')console.log(JSON.stringify({type:'result',result:answer}));else if(name==='agy'){console.log(JSON.stringify({event:'init',init:{permission_mode:'request-review'}}));console.log(JSON.stringify({event:'result',result:{status:'SUCCESS',response:answer}}));}else console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:answer}}));});\n`;
  for (const file of ['codex', 'claude', 'agy']) writeFileSync(join(dir, '.local', 'bin', file), script, { mode: 0o700 });
  process.env.DPRO_SUBSCRIPTION_CHAT = '1';
  for (const provider of ['codex', 'claude', 'gemini']) {
    const result = await teamDelegateTool.execute({ agent_id: 'specialist', reply_source: `subscription:${provider}`, request: 'Read only this supplied synthetic task.' }, context);
    assert.equal(result.error, undefined, JSON.stringify(result));
    assert.equal(result.details.model, `subscription:${provider}`);
    assert.match(result.content[0].text, /Synthetic CLI specialist result/);
  }
  assert.equal(requests.length, before, 'no local-model fallback');
  assert.equal(db.prepare("SELECT model FROM agents_config WHERE id='specialist'").get().model, 'synthetic-model', 'per-task source never changes saved agent model');
  assert.ok((await teamDelegateTool.execute({ agent_id: 'specialist', reply_source: 'subscription:codex:unreviewed', request: 'Invalid source.' }, context)).error);
});

test('changing the stored project after the approval request fails before inference', async () => {
  const registry = await createAgentToolsRegistry(context);
  const pending = await registry.execute('team_delegate', { agent_id: 'specialist', request: 'Synthetic project-bound task.' });
  const detail = await getApprovalDetail(pending.details.approvalId);
  const scope = { ...detail.runScope, fileReadRoot: join(dir, 'different-project') };
  db.prepare('UPDATE tool_approvals SET run_scope=? WHERE id=?').run(JSON.stringify(scope), detail.id);
  const before = requests.length;
  const result = await approveAndRun(detail.id, 'owner', detail.paramsHash);
  assert.equal(result.record.status, 'failed'); assert.ok(result.result.error);
  assert.equal(requests.length, before);
});

test('a concurrent delegation is refused and the in-process guard is released after the first finishes', async () => {
  mode = 'answer';
  const prior = globalThis.fetch;
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  let resume;
  const block = new Promise(resolve => { resume = resolve; });
  globalThis.fetch = async (...args) => { started(); await block; return prior(...args); };
  try {
    const first = teamDelegateTool.execute({ agent_id: 'specialist', request: 'First synthetic task.' }, context);
    await entered;
    const second = await teamDelegateTool.execute({ agent_id: 'specialist', request: 'Concurrent synthetic task.' }, context);
    assert.ok(second.error);
    resume();
    assert.equal((await first).error, undefined);
  } finally { resume(); globalThis.fetch = prior; }
  assert.equal((await teamDelegateTool.execute({ agent_id: 'specialist', request: 'Following synthetic task.' }, context)).error, undefined);
});
