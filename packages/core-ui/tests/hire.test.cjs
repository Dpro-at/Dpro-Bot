require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest, createSameOriginTransport } = require('../src/session.ts');
const { HireController, suggestedPreset, memoryTool } = require('../src/hire.ts');
const { HireAgent } = require('../src/HireAgent.tsx');
const { AgentsDestination } = require('../src/AgentsDestination.tsx');
const { allowedHire, hireResponse, validCreateBody, validGrantsBody } = require('../src/hire-contract.js');
const { createAgentsMock } = require('../src/agents-mock.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { allowed, createApplicationServer } = require('../scripts/application-server.cjs');

async function fixture(t) {
  const mock = createAgentsMock(); const calls = []; const base = createLoginMock(mock);
  const client = new SessionClient({ mock: async r => { calls.push(r); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const h = new HireController(client); t.after(() => h.dispose());
  return { client, h, mock, calls };
}
const markup = h => renderToStaticMarkup(React.createElement(HireAgent, { controller: h, onClose: () => {} }));
const sig = () => new AbortController().signal;

test('create body contract: role required, persona preset-based, nothing extra', () => {
  const ok = { role: 'specialist', name: 'Nora', department: 'marketing', description: 'Runs campaigns.', personality: { preset: 'bold-creative', dialect: 'ar', traits: { creativity: 90 } } };
  assert.equal(validCreateBody(ok), true);
  assert.equal(validCreateBody({ role: 'specialist' }), true);
  for (const bad of [
    {}, { role: 'boss' }, { ...ok, api_key: 'x' }, { ...ok, model: 'x' }, { ...ok, system_prompt: 'x' },
    { ...ok, name: ' padded' }, { ...ok, name: 'a‮b' }, { ...ok, name: 'x'.repeat(61) },
    { ...ok, department: 'Marketing' }, { ...ok, department: 'x'.repeat(65) },
    { ...ok, personality: { preset: 'evil' } }, { ...ok, personality: { preset: 'bold-creative', traits: { creativity: 101 } } },
    { ...ok, personality: { preset: 'bold-creative', traits: { charisma: 5 } } }, { ...ok, personality: { preset: 'bold-creative', lockedTraits: ['doubt'] } },
    { ...ok, personality: { preset: 'bold-creative', dialect: 'xx' } }, { ...ok, description: 'a\u0000b' },
  ]) assert.equal(validCreateBody(bad), false, JSON.stringify(bad));
});

test('grants contract: plain unique names with a version; no scopes from this page', () => {
  assert.equal(validGrantsBody({ grants: ['memory_search', 'web_fetch'], expectedVersion: 1 }), true);
  assert.equal(validGrantsBody({ grants: ['memory_search'], expectedVersion: 1, keepScopes: true }), true);
  assert.equal(validGrantsBody({ grants: ['memory_search'], expectedVersion: 1, keepScopes: false }), false);
  for (const bad of [
    { grants: ['a', 'a'], expectedVersion: 1 }, { grants: [{ tool: 'telegram_send', scopes: { destinations: ['x'] } }], expectedVersion: 1 },
    { grants: ['a'], expectedVersion: 0 }, { grants: ['a'] }, { grants: ['a'], expectedVersion: 1, parentAgentId: 'p' },
    { grants: ['bad name'], expectedVersion: 1 }, { grants: Array.from({ length: 501 }, (_, i) => `t${i}`), expectedVersion: 1 },
  ]) assert.equal(validGrantsBody(bad), false, JSON.stringify(bad).slice(0, 80));
});

test('every boundary allows exactly the hire routes', () => {
  const create = { role: 'manager' }; const put = { grants: ['memory_search'], expectedVersion: 2 };
  for (const allow of [allowedRequest, allowed, allowedHire]) {
    assert.equal(allow('POST', '/api/agents', create), true);
    assert.equal(allow('GET', '/api/agents/main/tool-grants', undefined), true);
    assert.equal(allow('PUT', '/api/agents/main/tool-grants', put), true);
    assert.equal(allow('POST', '/api/agents', { role: 'manager', api_key: 'x' }), false);
    assert.equal(allow('PUT', '/api/agents', create), false);
    assert.equal(allow('GET', '/api/agents/main/tool-grants', {}), false);
    assert.equal(allow('POST', '/api/agents/main/tool-grants', put), false);
    for (const path of ['/api/agents/../x/tool-grants', '/api/agents/main/tool-grants?x=1', '/api/agents/status/tool-grants', '/api/agents/main/tool-grants/x', '/api/agents/%61/tool-grants'])
      assert.equal(allow('PUT', path, put), false, path);
  }
});

test('responses are projected to reviewed fields; backend text never reaches the UI', () => {
  const created = hireResponse('/api/agents', 201, { agent: { id: 'a1', name: 'Nora', version: 1, api_key: 'secret', system_prompt: 'p' } });
  assert.deepEqual(created, { agent: { id: 'a1', name: 'Nora', version: 1 } });
  assert.deepEqual(hireResponse('/api/agents', 400, { error: 'Role must be one of …', code: 'invalid_role' }), { code: 'invalid_role' });
  assert.equal(hireResponse('/api/agents', 400, { error: 'stack trace here' }), null);
  assert.throws(() => hireResponse('/api/agents', 201, { agent: { id: '../x', version: 1 } }));
  const view = hireResponse('/api/agents/a1/tool-grants', 200, { agentId: 'a1', version: 3, source: 'owner', grants: [{ tool: 'telegram_send', scopes: { destinations: ['1'] } }, { tool: 'memory_search', scopes: null }],
    available: [{ name: 'web_fetch', description: 'd'.repeat(400), requiresApproval: false, allowedByServer: true, execClass: false, extensionId: 'x', mcp: null }, { name: 'bad name' }] });
  assert.deepEqual(view.grants, [{ tool: 'telegram_send', scoped: true }, { tool: 'memory_search', scoped: false }]);
  assert.equal(view.available.length, 1); assert.equal(view.available[0].description.length, 300);
  assert.deepEqual(Object.keys(view.available[0]).sort(), ['allowedByServer', 'description', 'execClass', 'name', 'requiresApproval']);
  assert.throws(() => hireResponse('/api/agents/a1/tool-grants', 200, { agentId: 'other', version: 1, grants: [] }));
  assert.deepEqual(hireResponse('/api/agents', 403, { error: 'x', code: 'read_only_stage' }), { code: 'read_only_stage' });
  assert.equal(hireResponse('/api/agents', 403, { error: 'x', code: 'other' }), null);
  assert.deepEqual(hireResponse('/api/agents/a1/tool-grants', 409, { code: 'version_conflict', currentVersion: 4, grants: [], error: 'x' }), { code: 'version_conflict', currentVersion: 4 });
});

test('persona suggestion follows role and department until the owner picks one', async t => {
  assert.equal(suggestedPreset('specialist', 'Finance'), 'careful-auditor');
  assert.equal(suggestedPreset('evaluator', ''), 'strict-evaluator');
  const { h } = await fixture(t);
  h.edit({ department: 'development' }); assert.equal(h.getSnapshot().draft.preset, 'precise-developer');
  h.edit({ preset: 'bold-creative' }); h.edit({ department: 'finance' }); assert.equal(h.getSnapshot().draft.preset, 'bold-creative');
  assert.equal(memoryTool('memory_save'), true); assert.equal(memoryTool('web_fetch'), false);
});

test('full offline hire: role → persona → one create → memory → permissions → one save', async t => {
  const { h, calls } = await fixture(t);
  assert.equal(h.getSnapshot().owner, true); assert.equal(h.getSnapshot().step, 'role');
  h.edit({ name: '  Nora   Sales ', role: 'specialist', department: ' Marketing ', description: 'Runs campaigns.' });
  h.go('persona'); assert.equal(h.getSnapshot().step, 'persona');
  h.edit({ dialect: 'ar' }); h.setTrait('creativity', 85); h.setTrait('doubt', 101); h.setTrait('warmth', 60); h.setTrait('warmth', undefined);
  assert.equal(calls.filter(c => c.method !== 'GET' && c.path !== '/api/auth/login').length, 0, 'nothing sent before Hire');
  await h.create();
  const post = calls.find(c => c.method === 'POST' && c.path === '/api/agents');
  assert.deepEqual(post.body, { name: 'Nora Sales', role: 'specialist', department: 'marketing', description: 'Runs campaigns.', personality: { preset: 'bold-creative', dialect: 'ar', traits: { creativity: 85 } } });
  let s = h.getSnapshot();
  assert.equal(s.step, 'memory'); assert.equal(s.agent.name, 'Nora Sales'); assert.equal(s.grantsVersion, 1);
  assert.deepEqual([...s.selected].sort(), ['memory_forget', 'memory_save', 'memory_search', 'storage_search']);
  h.edit({ name: 'changed' }); assert.equal(h.getSnapshot().draft.name, '  Nora   Sales ', 'draft is frozen after hire');
  await h.create(); assert.equal(calls.filter(c => c.method === 'POST' && c.path === '/api/agents').length, 1, 'never a second create');
  assert.match(markup(h), /Hired — choose how careful it is/); assert.doesNotMatch(markup(h), /nothing is saved until you hire/);
  assert.match(markup(h), /aria-label="memory_save"/);
  h.toggle('memory_forget'); h.next(); assert.equal(h.getSnapshot().step, 'permissions');
  h.toggle('web_fetch'); h.toggle('exec');
  assert.ok(!h.getSnapshot().selected.includes('exec'), 'a tool the server turned off cannot be granted');
  assert.match(markup(h), /Asks you first/); assert.match(markup(h), /Off on this server/);
  await h.save();
  const put = calls.find(c => c.method === 'PUT');
  assert.deepEqual(put.body, { grants: ['memory_search', 'memory_save', 'storage_search', 'web_fetch'], expectedVersion: 1, keepScopes: true });
  s = h.getSnapshot(); assert.equal(s.step, 'done'); assert.equal(s.phase, 'done'); assert.equal(s.grantsVersion, 2);
  assert.match(markup(h), /joined your team with 4 permissions/);
  h.restart(); assert.equal(h.getSnapshot().step, 'role'); assert.equal(h.getSnapshot().agent, undefined);
});

test('grants conflict re-reads the latest and asks for review; no blind overwrite', async t => {
  const { h, mock, calls } = await fixture(t);
  await h.create(); const id = h.getSnapshot().agent.id;
  await mock.transport({ method: 'PUT', path: `/api/agents/${id}/tool-grants`, body: { grants: ['memory_search'], expectedVersion: 1 }, headers: {}, signal: sig() });
  h.next(); h.toggle('web_fetch'); await h.save();
  const s = h.getSnapshot();
  assert.match(s.notice, /changed elsewhere/); assert.equal(s.grantsVersion, 2); assert.deepEqual(s.selected, ['memory_search']);
  assert.equal(calls.filter(c => c.method === 'PUT').length, 1);
  await h.save(); assert.equal(h.getSnapshot().step, 'done');
});

test('name taken keeps the draft; transport failure on create is unknown and never retried', async t => {
  const { h, calls, client } = await fixture(t);
  h.edit({ name: 'Offline main' }); await h.create();
  assert.match(h.getSnapshot().notice, /already used/); assert.equal(h.getSnapshot().draft.name, 'Offline main'); assert.equal(h.getSnapshot().agent, undefined);
  const inner = createLoginMock();
  const failing = new SessionClient({ mock: async r => { if (r.method === 'POST' && r.path === '/api/agents') throw Error('network'); return inner(r); } });
  failing.selectMode('mock'); await failing.login('demo@example.invalid', 'mock-only');
  const f = new HireController(failing); t.after(() => f.dispose());
  await f.create(); assert.equal(f.getSnapshot().phase, 'unknown'); assert.match(f.getSnapshot().notice, /may or may not exist/);
  await f.create(); assert.equal(f.getSnapshot().phase, 'unknown');
  assert.ok(client);
  assert.equal(calls.filter(c => c.method === 'POST' && c.path === '/api/agents').length, 1);
});

test('a read-only test server is named as such, not as a sign-in problem', async t => {
  const inner = createLoginMock();
  const client = new SessionClient({ mock: async r => (r.method === 'POST' && r.path === '/api/agents' ? { status: 403, body: { code: 'read_only_stage' } } : inner(r)) });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const h = new HireController(client); t.after(() => h.dispose());
  await h.create();
  assert.equal(h.getSnapshot().phase, 'error'); assert.match(h.getSnapshot().notice, /does not accept changes/);
  assert.equal(client.getSnapshot().phase, 'authenticated');
});

test('not the owner: no hire controls and no requests', async t => {
  const client = new SessionClient({ mock: createLoginMock() });
  const h = new HireController(client); t.after(() => h.dispose());
  assert.equal(h.getSnapshot().owner, false); assert.equal(h.getSnapshot().phase, 'denied');
  await h.create(); assert.equal(h.getSnapshot().agent, undefined);
  const page = renderToStaticMarkup(React.createElement(AgentsDestination, { client }));
  assert.doesNotMatch(page, /Hire an agent/);
});

test('markup escapes tool text and shows the three steps (Who, Personality, How careful)', async t => {
  const { h } = await fixture(t);
  assert.match(markup(h), /aria-label="Steps"/); assert.match(markup(h), /aria-current="step"[^>]*>.*Who/);
  for (const r of ['Lead', 'Manager', 'Specialist', 'Reviewer']) assert.match(markup(h), new RegExp(r));
  h.edit({ name: '<img src=x onerror=alert(1)>' }); assert.doesNotMatch(markup(h), /<img src=x/);
});

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
test('ephemeral fictional HTTP bridge: hire flow end to end with redaction', async t => {
  const mock = createAgentsMock(); const base = createLoginMock(mock); const upstream = [];
  const backend = http.createServer(async (req, res) => {
    const parts = []; for await (const part of req) parts.push(part);
    const text = Buffer.concat(parts).toString(); const body = text ? JSON.parse(text) : undefined;
    upstream.push({ path: req.url, method: req.method, body });
    const result = await base({ path: req.url, method: req.method, body, headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {}, signal: sig() });
    if (result.body?.agent) result.body.agent = { ...result.body.agent, api_key: 'private-fixture', system_prompt: 'private-fixture' };
    if (Array.isArray(result.body?.available)) result.body.available = result.body.available.map(x => ({ ...x, extensionId: 'private-fixture' }));
    res.writeHead(result.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result.body));
  });
  const upstreamPort = await listen(backend); const app = createApplicationServer({ channel: 'candidate', upstreamPort }); const port = await listen(app);
  t.after(async () => { await close(app); await close(backend); }); const origin = `http://127.0.0.1:${port}`;
  const seen = [];
  const transportFn = async (target, init) => {
    const r = await globalThis.fetch(origin + new URL(target).pathname, { ...init, headers: { ...init.headers, Origin: origin } });
    const body = await r.json(); seen.push(body);
    return { status: r.status, headers: r.headers, url: target, redirected: r.redirected, json: async () => body };
  };
  const client = new SessionClient({ live: createSameOriginTransport('http://127.0.0.1:42522', transportFn) });
  client.selectMode('live'); await client.login('demo@example.invalid', 'mock-only');
  const h = new HireController(client); t.after(() => h.dispose());
  h.edit({ name: 'Bridge hire', role: 'manager' }); await h.create();
  assert.equal(h.getSnapshot().step, 'memory', JSON.stringify(h.getSnapshot()));
  h.next(); h.toggle('web_fetch'); await h.save(); assert.equal(h.getSnapshot().step, 'done');
  assert.doesNotMatch(JSON.stringify(seen), /private-fixture/);
  const r = await globalThis.fetch(origin + '/api/agents', { method: 'POST', headers: { Authorization: 'Bearer fictional', Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'manager', api_key: 'x' }) });
  assert.equal(r.status, 400);
  assert.equal(upstream.filter(u => u.method === 'POST' && u.path === '/api/agents').length, 1);
});
