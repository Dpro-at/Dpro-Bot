// CH6 "Change the task…" (Mohamed 2026-10-28): the owner rewrites a waiting hand-off's task before Allow once.
// The approval then covers exactly the edited text: a new paramsHash, the old one refused, agent_id and every other
// parameter fixed, owner only, only while waiting, the team_delegate limit (1..12000), audited; no other tool.
// Throwaway DB + cwd, random test-only secrets, the delegated model stubbed (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backend = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'change-task-'));
mkdirSync(join(dir, '.data'));
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex');
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
process.env.AGENT_EXEC_TOOLS = 'true';
process.env.OLLAMA_URL = 'http://127.0.0.1:11434';
const fetchOriginal = globalThis.fetch;
const prompts = [];
globalThis.fetch = async (url, init) => {
  assert.equal(String(url), 'http://127.0.0.1:11434/api/chat');
  prompts.push(JSON.parse(init.body).messages.map(m => m.content).join('\n'));
  return new Response(JSON.stringify({ message: { content: '{"type":"answer","text":"Synthetic delegated findings."}' } }), { status: 200 });
};
const quiet = { log: console.log, warn: console.warn };
console.log = () => {}; console.warn = () => {};
const { getDatabase, closeDatabase } = await import(join(backend, 'src/db/database.ts'));
const db = getDatabase(); await db.initialize();
for (const [id, role] of [['owner', 'owner'], ['admin', 'admin'], ['user', 'user']]) db.prepare("INSERT INTO users(id,email,username,password_hash,role,status) VALUES(?,?,?,'x',?,'active')").run(id, `${id}@example.test`, id, role);
db.prepare('UPDATE agents_config SET is_primary=0').run();
db.prepare("INSERT INTO agents_config(id,name,is_primary,provider,model) VALUES('coordinator','Coordinator',1,'ollama','main-model')").run();
db.prepare("INSERT INTO agents_config(id,name,is_primary,provider,model,system_prompt) VALUES('specialist','Specialist',0,'ollama','synthetic-model','Synthetic specialist instructions')").run();
db.prepare("INSERT INTO agents_config(id,name,is_primary,provider,model) VALUES('other','Other',0,'ollama','synthetic-model')").run();
const { createAgentToolsRegistry } = await import(join(backend, 'src/tools/index.ts'));
const { setAgentGrants } = await import(join(backend, 'src/tools/grants.ts'));
const approvals = await import(join(backend, 'src/tools/approvals.ts'));
const { registerAuthGate } = await import(join(backend, 'src/auth/auth-gate.ts'));
const { approvalsRoutes } = await import(join(backend, 'src/api/routes/approvals.ts'));
const { generateToken } = await import(join(backend, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const context = { workspaceDir: dir, fileReadRoot: dir, agentId: 'coordinator', userId: 'owner', sessionId: 'synthetic-team-session', memoryDrawers: [] };
const available = (await createAgentToolsRegistry(context)).listRegistered();
await setAgentGrants('coordinator', { grants: ['team_list', 'team_delegate', 'team_results', 'read'] }, 'owner', available);
await setAgentGrants('specialist', { grants: ['read'] }, 'owner', available);
const app = Fastify();
registerAuthGate(app);
await app.register(approvalsRoutes);
await app.ready();
console.log = quiet.log; console.warn = quiet.warn;
test.after(async () => { globalThis.fetch = fetchOriginal; await app.close(); closeDatabase(); process.chdir(backend); rmSync(dir, { recursive: true, force: true }); });

const auth = id => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const quietly = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };
const ask = async (request = 'Inspect synthetic evidence.') => {
  const result = await quietly(async () => (await createAgentToolsRegistry(context)).execute('team_delegate', { agent_id: 'specialist', request }));
  assert.equal(result.details?.status, 'pending_approval');
  return result.details.approvalId;
};
const detail = async id => (await app.inject({ method: 'GET', url: `/api/approvals/${id}`, headers: auth('owner') })).json().approval;
const change = (id, payload, who = 'owner') => quietly(() => app.inject({ method: 'POST', url: `/api/approvals/${id}/request`, headers: auth(who), payload }));
const approve = (id, paramsHash) => quietly(() => app.inject({ method: 'POST', url: `/api/approvals/${id}/approve`, headers: auth('owner'), payload: { paramsHash } }));
const audits = id => db.prepare("SELECT action, success, metadata FROM audit_logs WHERE resource_id = ? AND action = 'tool_approval.change_request'").all(id);

test('the owner changes the task, then Allow once runs exactly the changed text (and says it was changed)', async () => {
  const id = await ask('Inspect synthetic evidence.');
  const before = await detail(id);
  const res = await change(id, { paramsHash: before.paramsHash, request: 'Only check the footer links.' });
  assert.equal(res.statusCode, 200, res.body);
  const after = res.json().approval;
  assert.equal(after.status, 'pending');
  assert.deepEqual(after.params, { agent_id: 'specialist', request: 'Only check the footer links.' }, 'only the request changed');
  assert.match(after.paramsHash, /^[0-9a-f]{64}$/); assert.notEqual(after.paramsHash, before.paramsHash, 'a new hash over the edited parameters');
  assert.ok(after.editedAt, 'the card can say it was changed');
  assert.deepEqual(after.runScope, before.runScope, 'the run scope stays');
  assert.equal(after.agentId, 'coordinator');
  const row = db.prepare('SELECT * FROM tool_approvals WHERE id = ?').get(id);
  assert.ok(!row.params_encrypted.includes('footer'), 'stored encrypted');
  assert.equal(row.edited_by, 'owner');
  const log = audits(id);
  assert.equal(log.length, 1); assert.equal(log[0].success, 1);
  assert.ok(!String(log[0].metadata).includes('footer'), 'the audit log records the change, never the text');
  const n = prompts.length;
  const ran = await approve(id, after.paramsHash);
  assert.equal(ran.statusCode, 200, ran.body);
  assert.equal(ran.json().approval.status, 'executed');
  assert.equal(prompts.length, n + 1);
  assert.match(prompts.at(-1), /Only check the footer links\./, 'the executed call used the edited text');
  assert.ok(!prompts.at(-1).includes('Inspect synthetic evidence'), 'and never the old text');
  assert.match(ran.json().approval.resultPreview, /^The owner changed the task before allowing it/);
});

test('the old hash is refused for Allow once and for another change; nothing runs', async () => {
  const id = await ask();
  const old = (await detail(id)).paramsHash;
  assert.equal((await change(id, { paramsHash: old, request: 'Changed once.' })).statusCode, 200);
  const n = prompts.length;
  const stale = await approve(id, old);
  assert.equal(stale.statusCode, 409);
  assert.equal((await change(id, { paramsHash: old, request: 'Changed twice.' })).statusCode, 409);
  assert.equal(prompts.length, n);
  assert.equal(db.prepare('SELECT status FROM tool_approvals WHERE id = ?').get(id).status, 'pending');
  assert.deepEqual((await detail(id)).params.request, 'Changed once.');
  // A hash typed by hand for the edited text (any other salt) is refused too.
  const forged = await approve(id, 'f'.repeat(64));
  assert.equal(forged.statusCode, 409);
  assert.equal(prompts.length, n);
});

test('members, admins and anonymous callers cannot change a task', async () => {
  const id = await ask();
  const { paramsHash } = await detail(id);
  assert.equal((await quietly(() => app.inject({ method: 'POST', url: `/api/approvals/${id}/request`, payload: { paramsHash, request: 'x' } }))).statusCode, 401);
  for (const who of ['admin', 'user']) assert.equal((await change(id, { paramsHash, request: 'Hijacked.' }, who)).statusCode, 403, who);
  assert.equal((await detail(id)).params.request, 'Inspect synthetic evidence.');
  assert.equal((await detail(id)).paramsHash, paramsHash);
});

test('agent_id and every other parameter cannot change: only request is accepted', async () => {
  const id = await ask();
  const { paramsHash } = await detail(id);
  for (const payload of [{ paramsHash, request: 'x', agent_id: 'other' }, { paramsHash, agent_id: 'other' }, { paramsHash, request: 'x', reply_source: 'subscription:claude' }, { paramsHash, request: 'x', params: { agent_id: 'other' } }]) {
    assert.equal((await change(id, payload)).statusCode, 400, JSON.stringify(payload));
  }
  assert.equal((await change(id, { paramsHash, request: { agent_id: 'other' } })).statusCode, 400, 'request must be text');
  const now = await detail(id);
  assert.deepEqual(now.params, { agent_id: 'specialist', request: 'Inspect synthetic evidence.' });
  assert.equal(now.paramsHash, paramsHash);
});

test('a request that is no longer waiting cannot change', async () => {
  const denied = await ask();
  const d = await detail(denied);
  assert.equal((await quietly(() => app.inject({ method: 'POST', url: `/api/approvals/${denied}/deny`, headers: auth('owner') }))).statusCode, 200);
  assert.equal((await change(denied, { paramsHash: d.paramsHash, request: 'Too late.' })).statusCode, 409);
  const expired = await ask();
  const e = await detail(expired);
  db.prepare("UPDATE tool_approvals SET requested_at = '2000-01-01 00:00:00' WHERE id = ?").run(expired);
  assert.equal((await change(expired, { paramsHash: e.paramsHash, request: 'Too late.' })).statusCode, 409);
  assert.equal(db.prepare('SELECT status FROM tool_approvals WHERE id = ?').get(expired).status, 'expired');
  assert.equal((await change('00000000-0000-4000-8000-000000000000', { paramsHash: e.paramsHash, request: 'x' })).statusCode, 404);
  assert.equal(audits(denied).at(-1).success, 0, 'a refused change is in the audit log too');
});

test('too long or empty text is refused; 12000 characters is allowed', async () => {
  const id = await ask();
  const { paramsHash } = await detail(id);
  for (const request of ['x'.repeat(12001), '', '   \n ']) assert.equal((await change(id, { paramsHash, request })).statusCode, 400, `length ${request.length}`);
  assert.equal((await detail(id)).paramsHash, paramsHash);
  const ok = await change(id, { paramsHash, request: 'y'.repeat(12000) });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().approval.params.request.length, 12000);
});

test('only a hand-off can be changed: another tool\'s waiting request is refused', async () => {
  const pending = await quietly(() => approvals.requestApproval({ name: 'telegram_send' }, { chat: 'c1', text: 'hello' }, { agentId: 'coordinator', userId: 'owner', sessionId: 's2' }, 'message'));
  const id = pending.details.approvalId;
  const { paramsHash } = await detail(id);
  assert.equal((await change(id, { paramsHash, request: 'other' })).statusCode, 400);
  await assert.rejects(approvals.editApprovalRequest(id, 'owner', paramsHash, 'other'), e => e.status === 400);
  assert.equal((await detail(id)).paramsHash, paramsHash);
});
