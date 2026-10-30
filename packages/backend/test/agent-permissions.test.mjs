// CORE-PERMS-01: per-agent memory scope and off / ask / allow per tool
// category. Owner-only API (versioned, audited) and enforcement in the tools
// registry and the memory repository.
// Run: node --import tsx --test test/agent-permissions.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-agent-perms-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
delete process.env.AGENT_EXEC_TOOLS;

const quiet = { log: console.log, warn: console.warn, error: console.error };
console.log = () => {};
console.warn = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('ap-owner', 'owner');
addUser('ap-admin', 'admin');
addUser('ap-user', 'user');
db.prepare(`INSERT INTO agents_config (id, name) VALUES ('legacy-agent', 'Legacy')`).run();

const perms = await import(join(backendDir, 'src/tools/agent-permissions.ts'));
const tools = await import(join(backendDir, 'src/tools/index.ts'));
const { repositories } = await import(join(backendDir, 'src/repositories/index.ts'));
const { userActor } = await import(join(backendDir, 'src/repositories/actor.ts'));
const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { agentPermissionsRoutes } = await import(join(backendDir, 'src/api/routes/agent-permissions.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');

const app = Fastify();
registerAuthGate(app);
await app.register(agentPermissionsRoutes);
await app.ready();
Object.assign(console, quiet);

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const auth = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const url = (id) => `/api/agents/${id}/permissions`;
const get = (id, who = 'ap-owner') => app.inject({ method: 'GET', url: url(id), headers: auth(who) });
const put = (id, payload, who = 'ap-owner') => app.inject({ method: 'PUT', url: url(id), headers: auth(who), payload });
const ALL = ['owner', 'project', 'experience', 'task', 'people'];
const modes = (m = {}) => ({ browser: 'ask', network: 'ask', message: 'ask', delete: 'ask', install: 'ask', money: 'off', settings: 'ask', ...m });
const body = (over = {}) => ({ memoryRead: ALL, memoryWrite: ALL, sharedMemory: false, modes: modes(), ...over });
const text = (r) => (r.content || []).map((c) => c.text).join('\n');

async function hire(name) {
  const owner = userActor({ id: 'ap-owner', role: 'owner' });
  return (await repositories.agents.createConfig(owner, { name, role: 'specialist' })).id;
}

test('categories: browser_*, network (web fetch, MCP), and the risky ones by their approval category', () => {
  const cat = (name, extra = {}) => perms.permissionCategory({ name, ...extra });
  assert.equal(cat('browser_navigate'), 'browser');
  assert.equal(cat('web_fetch'), 'network');
  assert.equal(cat('mcp__srv__x', { mcp: {} }), 'network');
  assert.equal(cat('telegram_send'), 'message');
  assert.equal(cat('some_new_send'), 'message');
  assert.equal(cat('storage_delete'), 'delete');
  assert.equal(cat('memory_delete'), 'delete');
  assert.equal(cat('skill_install'), 'install');
  assert.equal(cat('trading_execute'), 'money');
  assert.equal(cat('credentials_save'), 'settings');
  assert.equal(cat('memory_search'), null);
  assert.equal(perms.modeFor(undefined, { name: 'web_fetch' }), 'allow', 'no stored row: the behaviour before CORE-PERMS-01');
});

test('only the owner may read or change permissions', async () => {
  const id = await hire('Gate Check');
  for (const who of ['ap-admin', 'ap-user']) {
    assert.equal((await get(id, who)).statusCode, 403);
    assert.equal((await put(id, { ...body(), expectedVersion: 1 }, who)).statusCode, 403);
  }
  assert.equal((await app.inject({ method: 'GET', url: url(id) })).statusCode, 401);
});

test('defaults: a new agent starts Careful; an older agent keeps the earlier behaviour', async () => {
  const id = await hire('Nova Perms');
  const fresh = (await get(id)).json();
  assert.equal(fresh.version, 1); assert.equal(fresh.stored, true);
  assert.deepEqual(fresh.modes, modes());
  assert.deepEqual(fresh.memoryRead, ['project', 'task']); assert.deepEqual(fresh.memoryWrite, []); assert.equal(fresh.sharedMemory, false);
  const old = (await get('legacy-agent')).json();
  assert.equal(old.version, 0); assert.equal(old.stored, false);
  assert.equal(old.modes.browser, 'allow'); assert.equal(old.modes.network, 'allow'); assert.equal(old.modes.money, 'ask');
  assert.equal((await get('nope-agent')).statusCode, 404);
});

test('PUT: full replacement, versioned, validated, risky allow needs confirmation, audited', async () => {
  const id = await hire('Atlas Perms');
  const bad = async (payload, code) => {
    const r = await put(id, payload);
    assert.equal(r.statusCode, 400, `${JSON.stringify(payload)} -> ${r.body}`);
    assert.equal(r.json().code, code);
  };
  await bad(body(), 'invalid_version');
  await bad({ ...body(), expectedVersion: 1, extra: 1 }, 'invalid_permissions');
  await bad({ ...body({ memoryRead: ['owner', 'secret'] }), expectedVersion: 1 }, 'invalid_permissions');
  await bad({ ...body({ memoryRead: ['task'], memoryWrite: ['owner'] }), expectedVersion: 1 }, 'invalid_permissions');
  await bad({ ...body({ modes: { browser: 'off' } }), expectedVersion: 1 }, 'invalid_permissions');
  await bad({ ...body({ modes: modes({ network: 'maybe' }) }), expectedVersion: 1 }, 'invalid_permissions');
  await bad({ ...body({ sharedMemory: 'yes' }), expectedVersion: 1 }, 'invalid_permissions');
  await bad({ ...body({ modes: modes({ money: 'allow' }) }), expectedVersion: 1 }, 'risky_not_confirmed');
  const ok = await put(id, { ...body({ memoryRead: ['task', 'project'], memoryWrite: ['task'], sharedMemory: true, modes: modes({ browser: 'off', network: 'allow', delete: 'allow' }) }), expectedVersion: 1, confirmRisky: true });
  assert.equal(ok.statusCode, 200, ok.body);
  assert.equal(ok.json().version, 2); assert.equal(ok.headers.etag, '"2"');
  assert.deepEqual(ok.json().memoryRead, ['project', 'task']);
  const stale = await put(id, { ...body(), expectedVersion: 1 });
  assert.equal(stale.statusCode, 409); assert.equal(stale.json().code, 'version_conflict'); assert.equal(stale.json().currentVersion, 2);
  // A never-saved (older) agent is saved with expectedVersion 0.
  assert.equal((await put('legacy-agent', { ...body(), expectedVersion: 0 })).json().version, 1);
  const audit = db.prepare(`SELECT success FROM audit_logs WHERE action = 'agent_permissions.update' AND resource_id = ? ORDER BY id`).all(id);
  assert.ok(audit.some((a) => a.success === 1) && audit.some((a) => a.success === 0));
});

function fakeTool(name, extra = {}) {
  return { name, description: 'test tool', input_schema: { type: 'object', properties: {} }, execute: async () => ({ content: [{ type: 'text', text: `ran ${name}` }] }), ...extra };
}
async function registryFor(agentId, names) {
  const reg = await tools.createAgentToolsRegistry({ workspaceDir: dir, agentId, userId: 'ap-owner', sessionId: 's-perm', grants: { agentId, tools: new Map(names.map((n) => [n, null])) } });
  for (const n of names) reg.register(fakeTool(n, n.startsWith('mcp__') ? { mcp: { serverId: 'x', serverName: 'x', toolName: 'w', qualifiedName: 'mcp:x:w' }, requiresApproval: true } : {}));
  return reg;
}
const quietly = async (fn) => { const s = { ...console }; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { Object.assign(console, s); } };

test('registry: off = not offered and refused; ask = approval; allow = runs, but never lifts a tool\'s own approval', async () => {
  const id = await hire('Wren Perms');
  const names = ['browser_navigate', 'web_fetch', 'demo_send', 'mcp__x__write'];
  let v = (await get(id)).json().version;
  const set = async (m) => { const r = await put(id, { ...body({ modes: modes(m) }), expectedVersion: v }); assert.equal(r.statusCode, 200, r.body); v = r.json().version; };

  await set({ browser: 'off', network: 'ask', message: 'allow' });
  let reg = await registryFor(id, names);
  assert.ok(!reg.getAll().some((t) => t.name === 'browser_navigate'), 'off: not offered');
  const off = await quietly(() => reg.execute('browser_navigate', {}));
  assert.match(text(off), /switched off/);
  assert.equal((await quietly(() => reg.execute('web_fetch', {}))).details?.status, 'pending_approval', 'ask: network waits');
  assert.match(text(await quietly(() => reg.execute('demo_send', {}))), /ran demo_send/, 'allow: message runs');

  await set({ network: 'allow', message: 'ask' });
  reg = await registryFor(id, names);
  assert.match(text(await quietly(() => reg.execute('web_fetch', {}))), /ran web_fetch/);
  assert.equal((await quietly(() => reg.execute('demo_send', {}))).details?.status, 'pending_approval');
  assert.equal((await quietly(() => reg.execute('mcp__x__write', {}))).details?.status, 'pending_approval', 'a write-like MCP tool still asks');
  assert.equal((await quietly(() => reg.execute('browser_navigate', {}))).details?.status, 'pending_approval', 'browser back from off to ask');
});

test('memory scope: unread drawers are closed; read-only drawers refuse writes', async () => {
  const id = await hire('Iris Perms');
  const v = (await get(id)).json().version;
  assert.equal((await put(id, { ...body({ memoryRead: ['owner', 'task'], memoryWrite: ['task'] }), expectedVersion: v })).statusCode, 200);
  const reg = await tools.createAgentToolsRegistry({ workspaceDir: dir, agentId: id, userId: 'ap-owner', sessionId: 's-mem' });
  const ctx = reg.context ?? reg['context'];
  const { toolMemoryDrawers } = await import(join(backendDir, 'src/tools/memory/scope.ts'));
  const kinds = toolMemoryDrawers(ctx).map((d) => d.kind);
  assert.ok(kinds.includes('owner')); assert.ok(!kinds.includes('experience'), 'experience is not readable');
  const save = await quietly(() => reg.execute('memory_save', { content: 'The owner likes short answers', type: 'preference', importance: 3, drawer: 'owner' }));
  assert.match(text(save), /may not write/);
  const { actorFromToolContext } = await import(join(backendDir, 'src/repositories/actor.ts'));
  const actor = actorFromToolContext(ctx);
  assert.deepEqual([...actor.writeKinds], ['task']);
  await assert.rejects(repositories.memory.create(actor, { content: 'x', type: 'fact', importance: 3, drawer: { kind: 'owner' } }), /not open/i);
});

test('a delegated run gets the strictest of its own and the delegating agents\' permissions', async () => {
  const lead = await hire('Lead Strict');
  const worker = await hire('Worker Strict');
  const lv = (await get(lead)).json().version;
  await put(lead, { ...body({ memoryRead: ['task', 'project'], memoryWrite: ['task'], modes: modes({ network: 'off', message: 'allow' }) }), expectedVersion: lv });
  const wv = (await get(worker)).json().version;
  await put(worker, { ...body({ modes: modes({ network: 'allow', message: 'ask', browser: 'allow' }) }), expectedVersion: wv });
  const run = await perms.loadRunPermissions(worker, [lead]);
  assert.equal(run.modes.network, 'off');
  assert.equal(run.modes.message, 'ask');
  assert.equal(run.modes.browser, 'ask');
  assert.deepEqual(run.memoryRead, ['project', 'task']);
  assert.deepEqual(run.memoryWrite, ['task']);
  const reg = await tools.createAgentToolsRegistry({ workspaceDir: dir, agentId: worker, delegatedFrom: [lead], userId: 'ap-owner', grants: { agentId: worker, tools: new Map([['web_fetch', null]]) } });
  reg.register(fakeTool('web_fetch'));
  assert.match(text(await quietly(() => reg.execute('web_fetch', {}))), /switched off/);
});

test('reflect and derived saves respect read-only drawers', async () => {
  const { actorFromToolContext } = await import(join(backendDir, 'src/repositories/actor.ts'));
  const id = await hire('Reflect Strict');
  const v = (await get(id)).json().version;
  await put(id, { ...body({ memoryWrite: [] }), expectedVersion: v });
  const reg = await tools.createAgentToolsRegistry({ workspaceDir: dir, agentId: id, userId: 'ap-owner', sessionId: 's-ref' });
  const actor = actorFromToolContext(reg['context']);
  await assert.rejects(repositories.memory.saveDerived(actor, { id: 'derived-1', content: 'x', type: 'insight', importance: 3, drawer: { kind: 'experience' } }), /not open/i);
});
