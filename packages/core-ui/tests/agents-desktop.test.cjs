require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { HireController, careOf, careFields } = require('../src/hire.ts');
const { HireAgent } = require('../src/HireAgent.tsx');
const { StaffDirectory } = require('../src/StaffDirectory.tsx');
const { agentResponse } = require('../src/agents.ts');
const { agentCardResponse } = require('../src/agent-card-contract.js');
const { departmentIcon, departmentTone, personalityColour, roleWord } = require('../src/agent-look.ts');
const { permissionLine } = require('../src/agent-facts.ts');
const { createAgentsMock } = require('../src/agents-mock.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { allowed } = require('../scripts/application-server.cjs');

test('AG1 owner actions: make main agent, duplicate and remove are allowed with no body only', () => {
  for (const allow of [allowedRequest, allowed]) {
    assert.equal(allow('POST', '/api/agents/sample-main/set-primary'), true);
    assert.equal(allow('POST', '/api/agents/sample-main/duplicate'), true);
    assert.equal(allow('DELETE', '/api/agents/sample-main'), true);
    assert.equal(allow('POST', '/api/agents/sample-main/set-primary', { force: true }), false);
    assert.equal(allow('POST', '/api/agents/sample-main/duplicate', { name: 'x' }), false);
    assert.equal(allow('DELETE', '/api/agents/sample-main', {}), false);
    assert.equal(allow('DELETE', '/api/agents/..%2Fx'), false);
  }
  assert.deepEqual(agentCardResponse('/api/agents/sample-main/set-primary', 200, { success: true, error: 'stack' }), { ok: true });
  assert.deepEqual(agentCardResponse('/api/agents/sample-main/duplicate', 201, { agent: { id: 'copy-1', api_key: 'x', system_prompt: 'x' } }), { agent: { id: 'copy-1' } });
  assert.throws(() => agentCardResponse('/api/agents/sample-main/duplicate', 201, { agent: { id: '../x' } }));
  assert.deepEqual(agentResponse('/api/agents/sample-main', { status: 200, body: { success: true } }), { status: 200, body: { success: true } });
  assert.equal(agentResponse('/api/agents/sample-main', { status: 400, body: { error: 'Cannot delete the primary agent' } }).body, null);
});

test('agent look: departments keep their icon and colour, roles use the same four words', () => {
  assert.equal(departmentIcon('development'), 'code');
  assert.equal(departmentIcon('research'), 'flask');
  assert.equal(departmentIcon(null), 'inbox');
  assert.equal(departmentIcon('podcast studio'), 'folder');
  assert.deepEqual(departmentTone('sales'), departmentTone('Sales'));
  assert.equal(personalityColour('Calm leader'), personalityColour('Calm'));
  assert.deepEqual(['main', 'manager', 'specialist', 'evaluator', null].map(roleWord), ['Lead', 'Manager', 'Specialist', 'Reviewer', 'No role yet']);
  assert.equal(permissionLine({ browser: 'allow', network: 'allow', message: 'ask', delete: 'ask', install: 'ask', money: 'off', settings: 'allow' }), 'Asks before sending, deleting, installing');
  assert.equal(permissionLine(null), 'Could not be read');
});

test('staff list: quiet rows, owner commands only for the owner, inspector waits for a selection', () => {
  const state = { phase: 'ready', agents: [{ id: 'one', name: 'Nora', department: 'education', role: 'specialist', description: 'Private responsibilities', isPrimary: true }, { id: 'two', name: 'Ellis', department: 'legal', role: 'manager' }] };
  const controller = { subscribe: () => () => {}, getSnapshot: () => state };
  const render = props => renderToStaticMarkup(React.createElement(StaffDirectory, { controller, department: 'all', onOpen() {}, ...props }));
  const member = render();
  assert.match(member, /Main agent/); assert.match(member, /Talks to you first/); assert.match(member, /Manager/);
  assert.doesNotMatch(member, /Hire agent|Build your company|Private responsibilities/);
  const owner = render({ onHire() {}, onCompany() {}, query: 'ell' });
  assert.match(owner, /Hire agent/); assert.match(owner, /More team actions/);
  assert.match(owner, /Ellis/); assert.doesNotMatch(owner, /Nora/);
  assert.match(render({ department: 'main' }), /Nora/); assert.doesNotMatch(render({ department: 'main' }), /Ellis/);
});

async function hire(t) {
  const calls = []; const base = createLoginMock(createAgentsMock());
  const client = new SessionClient({ mock: async r => { calls.push(r); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const h = new HireController(client); t.after(() => h.dispose());
  return { h, calls };
}
test('AG4a "How careful" only fills the existing permission fields; a risky Allow still needs the confirmation', async t => {
  const { h, calls } = await hire(t);
  h.edit({ name: 'Care Hire', role: 'specialist' }); await h.create();
  h.applyCare('careful');
  let p = h.getSnapshot().permissions;
  assert.equal(careOf(p), 'careful'); assert.deepEqual([...p.memoryRead].sort(), ['project', 'task']); assert.equal(p.modes.money, 'off');
  const html = renderToStaticMarkup(React.createElement(HireAgent, { controller: h, onClose() {} }));
  for (const words of [/How careful/, /Careful/, /Normal/, /Trusted/, /Permissions: memory, projects and tools/, /will ask you before/]) assert.match(html, words);
  h.applyCare('trusted');
  p = h.getSnapshot().permissions; assert.equal(careOf(p), 'trusted'); assert.equal(p.modes.install, 'allow');
  assert.deepEqual(h.riskyAllowed(), ['install']);
  await h.save(); assert.match(h.getSnapshot().notice, /Confirm that the risky tools/);
  assert.equal(calls.filter(c => c.method === 'PUT').length, 0, 'nothing is sent before the confirmation');
  h.setConfirmRisky(true); await h.save();
  const put = calls.find(c => c.method === 'PUT' && c.path.endsWith('/permissions'));
  assert.deepEqual(put.body.modes, careFields.trusted.modes); assert.equal(put.body.confirmRisky, true);
  assert.equal(h.getSnapshot().step, 'done');
});
