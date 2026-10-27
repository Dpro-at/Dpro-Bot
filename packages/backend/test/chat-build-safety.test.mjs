// CHAT-BUILD-01 stage 1: chat safety and correctness.
//  - a journal row left 'running' without a live run never locks the conversation;
//  - a retry with the same runId after a lost 202 gets the accepted turn back, never a second one.
// Throwaway DB/keys; the local model is stubbed (no network).
// Run: node --import tsx --test test/chat-build-safety.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chat-build-'));
mkdirSync(join(dir, '.data', 'multi-agent'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_CONFIG_DIR = join(dir, 'cli-config');
process.env.AGENT_PLAYER_DATA_DIR = join(dir, '.data');
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
process.env.OLLAMA_URL = 'http://127.0.0.1:11434';
for (const k of ['AGENT_EXEC_TOOLS', 'OLLAMA_THINK', 'DEFAULT_MODEL']) delete process.env[k];

const script = [];
const bodies = [];
globalThis.fetch = async (url, init = {}) => {
  if (String(url) !== 'http://127.0.0.1:11434/api/chat') throw new Error(`unexpected network call in test: ${url}`);
  bodies.push(init.body);
  const lines = script.shift() ?? [{ message: { content: 'ok' }, done: true }];
  const enc = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { for (const l of lines) c.enqueue(enc.encode(JSON.stringify(l) + '\n')); c.close(); } }), { status: 200 });
};
const logged = [];
const capture = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
console.log = capture; console.info = capture; console.warn = capture; console.error = capture;

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
await getOrchestrator().initialize(join(dir, '.data', 'multi-agent', 'orchestrator.db'));
for (const [id, role] of [['b-owner', 'owner'], ['b-other', 'user']]) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`).run(id, `${id}@example.test`, id, role);
}
db.prepare(`INSERT INTO agents_config (id, name, provider, model, is_primary) VALUES ('b-agent', 'Build Agent', 'ollama', 'qwen-test', 1)`).run();

const tools = await import(join(backendDir, 'src/tools/index.ts'));
const grants = await import(join(backendDir, 'src/tools/grants.ts'));
const approvals = await import(join(backendDir, 'src/tools/approvals.ts'));
const sent = [];
tools.registerExtensionTool({ name: 'x_send_note', description: 'sends a note to someone', extensionId: 'x', requiresApproval: true,
  input_schema: { type: 'object', properties: { to: { type: 'string' } } },
  execute: async (p) => { sent.push(p.to); return { content: [{ type: 'text', text: `note sent to ${p.to}` }] }; } });
const avail = tools.createToolsRegistry({ workspaceDir: dir }).listRegistered();
await grants.setAgentGrants('b-agent', { grants: ['x_send_note'] }, 'b-owner', avail);
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const { chatRuns } = await import(join(backendDir, 'src/services/chat-runs.ts'));
const recovery = await import(join(backendDir, 'src/repositories/chat-recovery.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const as = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const call = (user, method, url, payload) => app.inject({ method, url, headers: as(user), ...(payload ? { payload } : {}) });
const ended = (runId) => new Promise((r) => { const run = chatRuns.get(runId); if (!run || run.status !== 'running') r(); else run.emitter.once('end', r); });
const rid = () => `run-${randomBytes(6).toString('hex')}`;
const newConversation = async () => (await call('b-owner', 'POST', '/api/chat/conversations', {})).json().conversation;
const journalState = (runId) => db.prepare('SELECT state FROM chat_run_journal WHERE run_id = ?').get(runId)?.state;

test('a journal row left running with no live run is reconciled; the next message is accepted', async () => {
  const c = await newConversation();
  const stale = rid();
  await recovery.acceptChatRun({ run_id: stale, session_id: c.id, user_id: 'b-owner', agent_id: null, started_at: Date.now() - 60_000 }, 'An earlier request');
  assert.equal(journalState(stale), 'running');
  const next = rid();
  const start = await call('b-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: next, message: 'Hello again' });
  assert.equal(start.statusCode, 202, start.body);
  await ended(next);
  assert.equal(journalState(stale), 'interrupted');
  assert.equal(journalState(next), 'complete');
  const messages = (await call('b-owner', 'GET', `/api/chat/conversations/${c.id}/messages`)).json().messages;
  assert.deepEqual(messages.map((m) => [m.role, m.status]), [['user', 'complete'], ['assistant', 'error'], ['user', 'complete'], ['assistant', 'complete']]);
  assert.equal(messages[1].code, 'run_interrupted');
});

test('a live run still answers conversation_busy', async () => {
  const c = await newConversation();
  let release;
  const gate = new Promise((r) => { release = r; });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (...a) => { await gate; return realFetch(...a); };
  const first = rid();
  try {
    assert.equal((await call('b-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: first, message: 'Slow one' })).statusCode, 202);
    const busy = await call('b-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: rid(), message: 'Second' });
    assert.equal(busy.statusCode, 409);
    assert.equal(busy.json().code, 'conversation_busy');
    assert.equal(journalState(first), 'running');
  } finally { globalThis.fetch = realFetch; release(); }
  await ended(first);
  assert.equal(journalState(first), 'complete');
});

test('the same runId after a lost 202 returns the accepted turn and never adds a second one', async () => {
  const c = await newConversation();
  const runId = rid();
  // The first POST was accepted and finished; its in-memory run is gone (as after the TTL).
  await recovery.acceptChatRun({ run_id: runId, session_id: c.id, user_id: 'b-owner', agent_id: null, started_at: Date.now() }, 'Do it once');
  await recovery.finishChatRun(runId, 'complete');
  const retry = await call('b-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId, message: 'Do it once' });
  assert.equal(retry.statusCode, 202, retry.body);
  assert.equal(retry.json().replayed, true);
  assert.equal(retry.json().userMessage.content, 'Do it once');
  const users = db.prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE session_id = ? AND role = 'user'").get(c.id).n;
  assert.equal(users, 1);
  // The same runId in another conversation is still refused.
  const other = await newConversation();
  const reused = await call('b-owner', 'POST', `/api/chat/conversations/${other.id}/runs`, { runId, message: 'Do it once' });
  assert.equal(reused.statusCode, 409);
  assert.equal(reused.json().code, 'run_id_reused');
});

test('an approval the owner decides returns into the chat: the conversation continues with the result', async () => {
  const c = await newConversation();
  script.push(
    [{ message: { content: '', tool_calls: [{ function: { name: 'x_send_note', arguments: { to: 'bob' } } }] } }, { done: true }],
    [{ message: { content: 'It waits for your approval.' } }, { done: true }],
  );
  const runId = rid();
  assert.equal((await call('b-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId, message: 'Send bob a note' })).statusCode, 202);
  await ended(runId);
  assert.deepEqual(sent, [], 'nothing runs before approval');
  const pending = db.prepare("SELECT id FROM tool_approvals WHERE session_id = ? AND status = 'pending'").all(c.id);
  assert.equal(pending.length, 1);
  const detail = await approvals.getApprovalDetail(pending[0].id);
  script.push([{ message: { content: 'Done: the note went to bob.' } }, { done: true }]);
  const before = bodies.length;
  await approvals.approveAndRun(detail.id, 'b-owner', detail.paramsHash);
  assert.deepEqual(sent, ['bob']);
  const cont = `approval-${detail.id}`;
  for (let i = 0; i < 50 && !chatRuns.get(cont); i++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(chatRuns.get(cont), 'a continuation turn started');
  await ended(cont);
  const messages = (await call('b-owner', 'GET', `/api/chat/conversations/${c.id}/messages`)).json().messages;
  assert.deepEqual(messages.slice(-2).map((m) => [m.role, m.content]), [['user', 'I decided the waiting approval. Continue the task with its result.'], ['assistant', 'Done: the note went to bob.']]);
  assert.match(bodies.slice(before).join('\n'), /note sent to bob/, 'the model got the approved result');
  assert.equal(sent.length, 1, 'the approved call never runs twice');
});

test('model choice: a picked Claude model is used as picked; only "auto" lets the router choose', async () => {
  const chat = await import(join(backendDir, 'src/api/routes/chat.ts'));
  assert.equal(chat.AUTO_MODEL, 'auto');
  const src = (await import('node:fs')).readFileSync(join(backendDir, 'src/api/routes/chat.ts'), 'utf8');
  assert.match(src, /if \(autoModel && \(provider === 'claude' \|\| provider === undefined\)\)/);
  assert.equal(chat.capMiddle('abc', 10), 'abc');
  const capped = chat.capMiddle('A'.repeat(5000) + 'END', 1000);
  assert.ok(capped.length <= 1000 && capped.startsWith('AAA') && capped.endsWith('END') && capped.includes('left out for size'));
});

test('long conversations open one page at a time (newest last) with earlier pages on request', async () => {
  const c = await newConversation();
  for (let i = 0; i < 7; i++) {
    const runId = rid();
    await recovery.acceptChatRun({ run_id: runId, session_id: c.id, user_id: 'b-owner', agent_id: null, started_at: Date.now() }, `message ${i}`);
    await recovery.finishChatRun(runId, 'complete');
  }
  const first = (await call('b-owner', 'GET', `/api/chat/conversations/${c.id}/messages?limit=3`)).json();
  assert.deepEqual(first.messages.map((m) => m.content), ['message 4', 'message 5', 'message 6']);
  assert.equal(first.hasMore, true);
  const second = (await call('b-owner', 'GET', `/api/chat/conversations/${c.id}/messages?limit=3&before=${first.messages[0].id}`)).json();
  assert.deepEqual(second.messages.map((m) => m.content), ['message 1', 'message 2', 'message 3']);
  const last = (await call('b-owner', 'GET', `/api/chat/conversations/${c.id}/messages?limit=3&before=${second.messages[0].id}`)).json();
  assert.deepEqual(last.messages.map((m) => m.content), ['message 0']);
  assert.equal(last.hasMore, false);
  assert.equal((await call('b-owner', 'GET', `/api/chat/conversations/${c.id}/messages`)).json().messages.length, 7, 'without paging the whole conversation (other callers)');
  assert.equal((await call('b-owner', 'GET', `/api/chat/conversations/${c.id}/messages?limit=0`)).statusCode, 400);
  assert.equal((await call('b-other', 'GET', `/api/chat/conversations/${c.id}/messages?limit=3`)).statusCode, 404);
});

test('stage 2: the chat list says who works and what waits; a chat can be archived and brought back', async () => {
  const c = await newConversation();
  const put = (body) => call('b-owner', 'PUT', `/api/chat/conversations/${c.id}`, body);
  assert.equal((await put({ archived: true })).json().conversation.archived, true);
  let row = (await call('b-owner', 'GET', '/api/chat/conversations')).json().conversations.find((x) => x.id === c.id);
  assert.equal(row.archived, true);
  assert.equal((await put({ archived: 'yes' })).statusCode, 400);
  assert.equal((await put({ archived: false })).json().conversation.archived, undefined);
  const reg = await tools.createAgentToolsRegistry({ workspaceDir: dir, userId: 'b-owner', sessionId: c.id, agentId: 'b-agent' });
  assert.equal((await reg.execute('x_send_note', { to: 'zed' })).details?.status, 'pending_approval');
  row = (await call('b-owner', 'GET', '/api/chat/conversations')).json().conversations.find((x) => x.id === c.id);
  assert.equal(row.waiting, 1);
  assert.equal(row.running, undefined);
  assert.equal((await call('b-other', 'PUT', `/api/chat/conversations/${c.id}`, { archived: true })).statusCode, 404);
});

test('stage 2: the sidebar layout is saved per person; bad values are refused', async () => {
  assert.deepEqual((await call('b-owner', 'GET', '/api/chat/sidebar')).json().sidebar, { order: ['scheduled', 'running', 'pinned', 'projects', 'other', 'archived'], hidden: ['archived'], folded: [] });
  const saved = (await call('b-owner', 'PUT', '/api/chat/sidebar', { order: ['pinned', 'other'], hidden: [], folded: ['proj-1'] })).json().sidebar;
  assert.deepEqual(saved.order.slice(0, 2), ['pinned', 'other']);
  assert.equal(saved.order.length, 6);
  assert.deepEqual((await call('b-other', 'GET', '/api/chat/sidebar')).json().sidebar.hidden, ['archived'], 'another person keeps the usual layout');
  for (const bad of [{}, { order: ['nope'] }, { folded: ['../x'] }, { theme: 'x' }]) assert.equal((await call('b-owner', 'PUT', '/api/chat/sidebar', bad)).statusCode, 400);
});
