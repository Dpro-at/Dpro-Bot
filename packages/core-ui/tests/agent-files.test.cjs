// Agent page › Files (boards AF1–AF3): wire contract and the part.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { allowedRequest } = require('../src/session.ts');
const { allowed, project } = require('../scripts/application-server.cjs');
const { libraryResponse, libraryPath, fileName } = require('../src/agent-library-contract.js');
const { AGENT_SECTIONS } = require('../src/AgentCard.tsx');

test('the Files routes pass only in their exact shape (browser client and bridge)', () => {
  const h = 'a'.repeat(64);
  for (const allow of [allowedRequest, allowed]) {
    assert.equal(allow('GET', libraryPath('agent-1')), true);
    assert.equal(allow('GET', libraryPath('agent-1', '/file', { name: 'notes.md' })), true);
    assert.equal(allow('GET', libraryPath('agent-1', '/file', { name: 'run.sh' })), false);
    assert.equal(allow('GET', '/api/agents/agent-1/library/file?name=notes.md&x=1'), false);
    assert.equal(allow('PUT', libraryPath('agent-1', '/file'), { name: 'notes.md', content: 'x', expectedHash: h }), true);
    assert.equal(allow('PUT', libraryPath('agent-1', '/file'), { name: 'MEMORY.md', content: 'x', expectedHash: null }), true);
    assert.equal(allow('PUT', libraryPath('agent-1', '/file'), { name: 'notes.md', content: 'x' }), false, 'the version is required');
    assert.equal(allow('POST', libraryPath('agent-1', '/file'), { name: 'notes.md', content: 'x', read: false }), true);
    assert.equal(allow('POST', libraryPath('agent-1', '/file'), { name: 'MEMORY.md', content: 'x' }), false, 'the two fixed files are not added');
    assert.equal(allow('POST', libraryPath('agent-1', '/file'), { name: 'notes.md', content: 'x'.repeat(1024 * 1024 + 1) }), false);
    assert.equal(allow('POST', libraryPath('agent-1', '/remove'), { name: 'notes.md' }), true);
    assert.equal(allow('POST', libraryPath('agent-1', '/restore'), { id: '1793047927000-ab12cd34' }), true);
    assert.equal(allow('POST', libraryPath('agent-1', '/restore'), { id: '../x' }), false);
    assert.equal(allow('POST', libraryPath('agent-1', '/read'), { name: 'notes.md', read: true }), true);
    assert.equal(allow('GET', libraryPath('agent-1', '/versions', { name: 'PERSONALITY.md' })), true);
    assert.equal(allow('GET', libraryPath('agent-1', '/version', { name: 'notes.md', id: '1793047927000-ab12cd34' })), true);
    assert.equal(allow('GET', '/api/agents/agent-1/knowledge'), false, 'the old routes are not reachable');
  }
  assert.equal(fileName('memory.md'), false);
  assert.equal(fileName('Price list (2026).csv'), true);
});

test('answers are cut down to what the part shows', () => {
  const list = libraryResponse(libraryPath('agent-1'), 200, { files: [{ name: 'PERSONALITY.md', kind: 'who', size: 10, read: true, path: '/secret' }, { name: '../x', kind: 'knowledge' }], removed: [{ id: '1-ab12cd34', name: 'old.md', removedAt: '2026-10-26T10:00:00Z' }] });
  assert.deepEqual(list.files, [{ name: 'PERSONALITY.md', kind: 'who', size: 10, read: true }]);
  assert.equal(list.removed.length, 1);
  const one = libraryResponse(libraryPath('agent-1', '/file', { name: 'notes.md' }), 200, { name: 'notes.md', kind: 'knowledge', content: 'hi', hash: 'b'.repeat(64), managed: null, redacted: true, read: false, extra: 1 });
  assert.deepEqual(one, { name: 'notes.md', kind: 'knowledge', content: 'hi', hash: 'b'.repeat(64), managed: null, redacted: true, read: false });
  assert.deepEqual(libraryResponse(libraryPath('agent-1', '/file'), 200, { hash: 'c'.repeat(64), redacted: false }), { hash: 'c'.repeat(64), redacted: false });
  assert.deepEqual(libraryResponse(libraryPath('agent-1', '/file'), 409, { code: 'changed', error: 'stack' }), { code: 'changed' });
  assert.deepEqual(project(libraryPath('agent-1', '/remove'), 200, { id: '1-ab12cd34', path: '/x' }), { id: '1-ab12cd34' });
});

test('Files is a part of the agent page', () => {
  assert.deepEqual(AGENT_SECTIONS.map(s => s.key), ['profile', 'persona', 'skills', 'memory', 'files', 'permissions', 'activity', 'subs']);
  const { AgentFiles } = require('../src/AgentFiles.tsx');
  const html = renderToStaticMarkup(React.createElement(AgentFiles, { client: { request: async () => ({ status: 200, body: {} }) }, agentId: 'agent-1', name: 'Coder', onDone() {} }));
  assert.match(html, /Reading its files/);
});
