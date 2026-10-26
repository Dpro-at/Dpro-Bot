// Org chart and sub-agents (boards OC1–OC3, SA1): wire contract, layout, moves, rendering.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { allowedRequest } = require('../src/session.ts');
const { allowed, project } = require('../scripts/application-server.cjs');
const { agentResponse } = require('../src/agents.ts');
const { orgResponse, orgFields } = require('../src/org-contract.js');
const { layoutChart, layoutDepartments, canMoveToDepartment, canMoveUnder, underOf, chartStep, linkPath } = require('../src/org-chart.ts');
const { OrgChart } = require('../src/OrgChart.tsx');
const { toolWords } = require('../src/AgentSubAgents.tsx');

const A = (id, o = {}) => ({ id, name: id[0].toUpperCase() + id.slice(1), version: 1, role: 'specialist', department: null, placed: 'auto', manager: 'lead', reportsTo: null, subAgentOf: null, ...o });
const team = [
  A('lead', { role: 'main', placed: 'main', manager: null, isPrimary: true }),
  A('dev', { role: 'manager', department: 'development' }),
  A('coder', { department: 'development', manager: 'dev' }),
  A('helper', { placed: 'sub', manager: 'coder', subAgentOf: 'coder' }),
  A('tester', { role: 'evaluator', department: 'development', manager: 'dev' }),
  A('writer', { department: 'research', placed: 'set', reportsTo: 'lead' }),
  A('small-local-agent', { placed: 'none', manager: null }),
];

test('the org routes pass the browser client and the bridge only in their exact shape', () => {
  for (const allow of [allowedRequest, allowed]) {
    assert.equal(allow('PUT', '/api/agents/coder/reports-to', { reportsTo: 'lead', expectedVersion: 3 }), true);
    assert.equal(allow('PUT', '/api/agents/coder/reports-to', { reportsTo: null }), true);
    assert.equal(allow('PUT', '/api/agents/coder/reports-to', {}), false);
    assert.equal(allow('PUT', '/api/agents/coder/reports-to', { reportsTo: '../x' }), false);
    assert.equal(allow('PUT', '/api/agents/coder/reports-to', { reportsTo: 'lead', extra: 1 }), false);
    assert.equal(allow('POST', '/api/agents/coder/sub-agents', { startsAs: 'copy', tools: ['memory_search'], name: 'Checker' }), true);
    assert.equal(allow('POST', '/api/agents/coder/sub-agents', { startsAs: 'copy', tools: ['a', 'a'] }), false);
    assert.equal(allow('POST', '/api/agents/coder/sub-agents', { startsAs: 'robot', tools: [] }), false);
    assert.equal(allow('POST', '/api/agents/coder/sub-agents', { startsAs: 'copy', tools: [], parentAgentId: 'x' }), false);
    assert.equal(allow('GET', '/api/agents/coder/sub-agent-work'), true);
    assert.equal(allow('GET', '/api/agents/coder/sub-agent-work', {}), false);
    assert.equal(allow('POST', '/api/agents/coder/sub-agent-work/3b5c-77/stop'), true);
    assert.equal(allow('POST', '/api/agents/coder/sub-agent-work/../stop'), false);
    // Make a full agent: only parentAgentId null rides on the grants body.
    assert.equal(allow('PUT', '/api/agents/helper/tool-grants', { grants: ['memory_search'], expectedVersion: 2, keepScopes: true, parentAgentId: null }), true);
    assert.equal(allow('PUT', '/api/agents/helper/tool-grants', { grants: ['memory_search'], expectedVersion: 2, parentAgentId: 'coder' }), false);
  }
});

test('org answers are cut down to what the pages use; agents keep only valid org fields', () => {
  assert.deepEqual(orgResponse('/api/agents/coder/reports-to', 200, { id: 'coder', reportsTo: 'lead', version: 4, secret: 'x' }), { id: 'coder', reportsTo: 'lead', version: 4 });
  assert.throws(() => orgResponse('/api/agents/coder/reports-to', 200, { id: 'other', reportsTo: null, version: 1 }));
  assert.deepEqual(orgResponse('/api/agents/coder/reports-to', 400, { code: 'circle', error: 'stack' }), { code: 'circle' });
  assert.deepEqual(orgResponse('/api/agents/coder/sub-agents', 400, { code: 'invalid_tools', error: '"exec" is not something Coder may use' }), { code: 'invalid_tools', error: '"exec" is not something Coder may use' });
  assert.deepEqual(orgResponse('/api/agents/coder/sub-agents', 201, { agent: { id: 'h2', name: 'Helper 2', api_key: 'k', subAgentOf: 'coder', placed: 'sub', manager: 'coder' } }), { agent: { id: 'h2', name: 'Helper 2', subAgentOf: 'coder', placed: 'sub', manager: 'coder' } });
  const work = orgResponse('/api/agents/coder/sub-agent-work', 200, { work: [{ id: 'w-1', kind: 'helper', agentId: 'helper', status: 'running', summary: 'x'.repeat(400), sessionId: 's-1', createdAt: '2026-10-26T10:00:00Z', token: 't' }, { id: 'w-2', status: 'odd' }] }).work;
  assert.equal(work.length, 1); assert.equal(work[0].summary.length, 160); assert.equal(work[0].token, undefined);
  assert.deepEqual(orgFields({ reportsTo: '../x', manager: 'lead', placed: 'weird', subAgentOf: null }), { manager: 'lead', subAgentOf: null });
  const listed = agentResponse('/api/agents', { status: 200, body: { agents: [{ ...team[3], system_prompt: 'x' }] } }).body.agents[0];
  assert.deepEqual([listed.placed, listed.manager, listed.subAgentOf, listed.system_prompt], ['sub', 'coder', 'coder', undefined]);
  const bridged = project('/api/agents', 200, { agents: [{ ...team[3] }] });
  assert.equal(bridged.agents[0].subAgentOf, 'coder');
});

test('layout: main agent on top, the agents under it side by side, deeper levels stacked, sub-agents dashed', () => {
  const c = layoutChart(team, new Set());
  const at = id => c.nodes.find(n => n.agent.id === id);
  assert.equal(c.nodes.some(n => n.agent.id === 'small-local-agent'), false);
  assert.equal(at('lead').depth, 0);
  assert.ok(at('dev').y > at('lead').y && at('writer').y === at('dev').y, 'dev and writer share the second row');
  assert.ok(at('coder').x > at('dev').x && at('coder').y > at('dev').y, 'coder is stacked under dev');
  assert.ok(at('helper').sub && at('helper').x > at('coder').x);
  assert.ok(c.links.some(l => l.dashed && l.to[0] === at('helper').x), 'a dashed line leads to the sub-agent');
  const down = c.links.find(l => l.kind === 'down'), side = c.links.find(l => l.kind === 'side');
  assert.match(linkPath(down, 'elbow'), /^M[\d.]+ [\d.]+V[\d.]+H[\d.]+V[\d.]+$/);
  assert.match(linkPath(down, 'curved'), /C/);
  assert.match(linkPath(down, 'straight'), /^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/);
  assert.match(linkPath(side, 'elbow'), /^M[\d.]+ [\d.]+V[\d.]+H[\d.]+$/);
  const folded = layoutChart(team, new Set(['dev']));
  assert.equal(folded.nodes.some(n => n.agent.id === 'coder'), false);
  assert.deepEqual(folded.nodes.find(n => n.agent.id === 'dev').hidden.map(a => a.id).sort(), ['coder', 'tester']);
  const found = layoutChart(team, new Set(['dev']), 'help');
  assert.ok(found.nodes.find(n => n.agent.id === 'helper').match, 'search opens the way to the match');
});

test('a wide team wraps into rows that fit the window, joined by a trunk', () => {
  const many = [team[0], ...Array.from({ length: 12 }, (_, i) => A(`agent${i}`))];
  const c = layoutChart(many, new Set(), '', 900);
  assert.ok(c.width <= 900, `width ${c.width}`);
  const rows = new Set(c.nodes.filter(n => n.depth === 1).map(n => n.y));
  assert.ok(rows.size > 1, 'more than one row');
  assert.equal(c.nodes.find(n => n.depth === 0).x, 24, 'the main agent sits top left');
  const wide = layoutChart(many, new Set());
  assert.equal(new Set(wide.nodes.filter(n => n.depth === 1).map(n => n.y)).size, 1, 'one row without a width');
});

test('by department: main agent on top, one column per department (No department last), sub-agents stay with their agent', () => {
  const c = layoutDepartments(team);
  assert.deepEqual(c.groups.map(g => g.department), ['development', 'research']);
  const at = id => c.nodes.find(n => n.agent.id === id);
  assert.equal(at('lead').depth, 0);
  const dev = c.groups[0];
  for (const id of ['dev', 'coder', 'tester', 'helper']) assert.ok(at(id).x >= dev.x && at(id).x < dev.x + dev.w, id + ' in Development');
  assert.ok(at('dev').y < at('coder').y, 'the manager first');
  assert.ok(at('helper').y > at('coder').y && at('helper').x > at('coder').x, 'the sub-agent right under its agent');
  assert.equal(c.links.length, 1); assert.ok(c.links[0].dashed);
  const none = layoutDepartments([...team, A('loner', { department: null })]);
  assert.equal(none.groups.at(-1).department, null);
  assert.ok(layoutDepartments(team, '', 500).groups[1].y > layoutDepartments(team, '', 500).groups[0].y, 'columns wrap');
  const by = id => team.find(a => a.id === id);
  assert.equal(canMoveToDepartment(by('writer'), 'development'), true);
  assert.equal(canMoveToDepartment(by('writer'), 'research'), false, 'already there');
  assert.equal(canMoveToDepartment(by('helper'), 'research'), false, 'a sub-agent stays with its agent');
});

test('moves: no circles, the main agent and sub-agents stay put, keyboard walks the chart', () => {
  const by = id => team.find(a => a.id === id);
  assert.equal(canMoveUnder(by('writer'), by('dev'), team), true);
  assert.equal(canMoveUnder(by('dev'), by('coder'), team), false, 'coder is under dev');
  assert.equal(canMoveUnder(by('lead'), by('dev'), team), false);
  assert.equal(canMoveUnder(by('helper'), by('dev'), team), false);
  assert.equal(canMoveUnder(by('writer'), by('helper'), team), false, 'a sub-agent has nobody under it');
  assert.equal(canMoveUnder(by('coder'), by('dev'), team), false, 'already there');
  assert.deepEqual([...underOf('dev', team)].sort(), ['coder', 'helper', 'tester']);
  const c = layoutChart(team, new Set());
  assert.equal(chartStep(c, 'coder', 'ArrowUp'), 'dev');
  assert.equal(chartStep(c, 'dev', 'ArrowDown'), 'coder');
  assert.equal(chartStep(c, 'dev', 'ArrowRight'), 'writer');
});

test('the chart renders cards as a tree with levels, the main tag and the sub-agent mark', () => {
  const html = renderToStaticMarkup(React.createElement(OrgChart, { agents: team, selected: 'coder', query: '', owner: true, onSelect() {}, onOpen() {}, onMenu() {}, onMove() {} }));
  assert.match(html, /role="tree"/);
  assert.match(html, /aria-level="1"[^>]*data-agent="lead"|data-agent="lead"[^>]*aria-level="1"/);
  assert.match(html, /Sub-agent of Coder/);
  assert.match(html, /aria-label="Zoom out"/);
  assert.match(html, /aria-label="Curved lines"/);
  assert.match(html, /aria-label="By department"/);
  assert.match(html, /aria-label="Coder, specialist"|aria-label="Coder, Specialist"/);
  assert.match(html, /Drag a card onto another agent/);
  assert.doesNotMatch(html, /small-local-agent/);
  const lonely = renderToStaticMarkup(React.createElement(OrgChart, { agents: [team[0]], selected: null, query: '', owner: true, onSelect() {}, onOpen() {}, onMenu() {}, onMove() {} }));
  assert.match(lonely, /Your main agent works alone for now/);
  assert.equal(toolWords('memory_search'), 'Memory search');
  assert.equal(toolWords('mcp:github:list_issues'), 'List issues');
});
