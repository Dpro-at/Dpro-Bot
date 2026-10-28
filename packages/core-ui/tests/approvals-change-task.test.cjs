// CH6 Change the task… on the Approvals page (2026-10-28): the same contract call and long-text editor as the chat card.
// Only a waiting team_delegate; the new paramsHash is used for Allow once; on 409 the request is read again.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('../../backend/node_modules/jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, NodeFilter: dom.window.NodeFilter, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
Object.defineProperty(dom.window.HTMLElement.prototype, 'innerText', { configurable: true, get() { return this.textContent; }, set(v) { this.textContent = v; } });
const React = require('../node_modules/react'); const { act } = React;
const { createRoot } = require('../node_modules/react-dom/client');
const { ApprovalPage, handOffTask } = require('../src/ApprovalPage.tsx');
const { allowedApproval } = require('../src/approvals-contract.js');
const AID = 'a1b2c3d4-0000-4000-8000-000000000001';
const OLD = 'a'.repeat(64), NEW = 'b'.repeat(64), MOVED = 'c'.repeat(64);
const base = { id: AID, toolName: 'team_delegate', status: 'pending', agentId: 'lead', category: 'other', truncated: false, requestedAt: '2026-10-28T10:00:00Z', expiresAt: '2026-10-29T10:00:00Z', decidedAt: null, executedAt: null, resultPreview: null, error: null, paramsPreview: {}, runScope: null };

function fakeClient({ editStatus = 200, toolName = 'team_delegate', maskedFields = [] } = {}) {
  const sent = [];
  let stored = { ...base, toolName, params: { agent_id: 'qa', request: 'Check the hero' }, paramsHash: OLD, maskedFields };
  const row = () => { const { params, paramsHash, maskedFields: m, runScope, ...r } = stored; return r; };
  return { sent, request: async req => {
    sent.push(req);
    if (req.method === 'GET' && req.path === '/api/agents') return { status: 200, body: { agents: [{ id: 'lead', name: 'Lead' }] } };
    if (req.method === 'GET' && req.path.startsWith('/api/approvals?')) return { status: 200, body: { approvals: [row()] } };
    if (req.method === 'GET') return { status: 200, body: { approval: stored } };
    if (req.path.endsWith('/request')) {
      assert.equal(allowedApproval('POST', req.path, req.body), true, 'the same contract call as the chat card');
      if (editStatus !== 200) { if (editStatus === 409) stored = { ...stored, paramsHash: MOVED }; return { status: editStatus, body: { code: editStatus === 409 ? 'approval_changed' : editStatus === 403 ? 'forbidden' : 'invalid_request' } }; }
      assert.equal(req.body.paramsHash, stored.paramsHash);
      stored = { ...stored, params: { ...stored.params, request: req.body.request }, paramsHash: NEW, editedAt: '2026-10-28T10:05:00Z' };
      return { status: 200, body: { approval: stored } };
    }
    if (req.path.endsWith('/approve')) return { status: 200, body: { approval: { ...row(), status: 'approved' }, result: { ok: true } } };
    return { status: 200, body: {} };
  } };
}
async function mount(t, client) {
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  t.after(async () => { await act(async () => root.unmount()); container.remove(); });
  await act(async () => { root.render(React.createElement(ApprovalPage, { client, active: true })); });
  await act(async () => {});
  await act(async () => { container.querySelector('button.approval-row').click(); });
  await act(async () => {});
  return container;
}
const button = (c, label) => [...c.querySelectorAll('button')].find(b => b.textContent === label);
const type = async (c, text) => { const input = c.querySelector('.doc-input'); await act(async () => { input.textContent = text; input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }); };
const check = async c => { const box = c.querySelector('.approval-review-check input'); await act(async () => { box.click(); }); };

test('handOffTask reads a hand-off\'s request only', () => {
  assert.equal(handOffTask({ toolName: 'team_delegate', params: { request: 'Hi' } }), 'Hi');
  assert.equal(handOffTask({ toolName: 'telegram_send', params: { request: 'Hi' } }), null);
  assert.equal(handOffTask({ toolName: 'team_delegate', params: { request: 5 } }), null);
  assert.equal(handOffTask(null), null);
});

test('Approvals: Change the task… saves through POST /request, reads the request again and Allow once sends the new hash', async t => {
  const client = fakeClient();
  const c = await mount(t, client);
  await act(async () => { button(c, 'Change the task…').click(); });
  const editor = c.querySelector('dialog.document-editor');
  assert.ok(editor, 'the long-text editor opens');
  assert.equal(editor.querySelector('.doc-input').textContent, 'Check the hero');
  assert.match(editor.textContent, /Allow once runs only the saved text/);
  await type(c, 'Only check the footer links.');
  await act(async () => { button(c, 'Save the task').click(); });
  await act(async () => {});
  const edit = client.sent.find(r => r.method === 'POST' && r.path.endsWith('/request'));
  assert.deepEqual(edit.body, { paramsHash: OLD, request: 'Only check the footer links.' });
  assert.equal(c.querySelector('dialog.document-editor'), null, 'the editor closes');
  assert.match(c.querySelector('.approval-notice').textContent, /Task changed/);
  assert.ok([...c.querySelectorAll('dd')].some(d => d.textContent === 'Only check the footer links.'), 'the shown request is the new one');
  assert.equal(button(c, 'Allow once').disabled, true, 'the new request has to be checked again');
  await check(c);
  await act(async () => { button(c, 'Allow once').click(); });
  await act(async () => {});
  assert.deepEqual(client.sent.find(r => r.path.endsWith('/approve')).body, { paramsHash: NEW }, 'Allow once covers the edited text only');
});

test('Approvals: a request that changed meanwhile is read again; an empty task and 403 are not taken as saved', async t => {
  const client = fakeClient({ editStatus: 409 });
  const c = await mount(t, client);
  await act(async () => { button(c, 'Change the task…').click(); });
  await type(c, '  ');
  await act(async () => { button(c, 'Save the task').click(); });
  assert.equal(client.sent.filter(r => r.path.endsWith('/request')).length, 0, 'an empty task is not sent');
  assert.match(c.querySelector('.doc-status').textContent, /Write the task first/);
  await type(c, 'New text');
  await act(async () => { button(c, 'Save the task').click(); });
  await act(async () => {}); await act(async () => {});
  assert.equal(c.querySelector('dialog.document-editor'), null);
  assert.match(c.querySelector('.approval-notice').textContent, /the task was not changed/);
  await check(c);
  await act(async () => { button(c, 'Allow once').click(); });
  await act(async () => {});
  assert.equal(client.sent.find(r => r.path.endsWith('/approve')).body.paramsHash, MOVED, 'Allow once uses the hash read again');
  const denied = fakeClient({ editStatus: 403 });
  const d = await mount(t, denied);
  await act(async () => { button(d, 'Change the task…').click(); });
  await type(d, 'Other text');
  await act(async () => { button(d, 'Save the task').click(); });
  await act(async () => {});
  assert.match(d.querySelector('.doc-status').textContent, /Only the owner can change the task/);
  assert.ok(d.querySelector('dialog.document-editor'), 'the editor stays open with the text');
});

test('Approvals: no Change the task for other tools; disabled while part of the task is hidden', async t => {
  const other = await mount(t, fakeClient({ toolName: 'telegram_send' }));
  assert.ok(button(other, 'Allow once'));
  assert.equal(button(other, 'Change the task…'), undefined);
  const hidden = await mount(t, fakeClient({ maskedFields: ['request'] }));
  assert.equal(button(hidden, 'Change the task…').disabled, true);
});
