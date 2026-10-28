// CH6 Change the task… (Mohamed 2026-10-28): the owner rewrites a waiting hand-off's task before Allow once; Allow once
// then sends the new paramsHash the server made over the edited text. Contract: only paramsHash + request, 1..12000.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('../../backend/node_modules/jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, NodeFilter: dom.window.NodeFilter, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
// jsdom has no modal dialogs, matchMedia or innerText: the smallest stand-ins the editor needs.
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
Object.defineProperty(dom.window.HTMLElement.prototype, 'innerText', { configurable: true, get() { return this.textContent; }, set(v) { this.textContent = v; } });
const React = require('../node_modules/react'); const { act } = React;
const { createRoot } = require('../node_modules/react-dom/client');
const { ApprovalCard, DelegationCard, MomentsContext, taskOf } = require('../src/ChatMoments.tsx');
const { allowedApproval, approvalResponse, approvalRoute, TASK_MAX, taskText } = require('../src/approvals-contract.js');
const CID = '3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b';
const AID = 'a1b2c3d4-0000-4000-8000-000000000001';
const OLD = 'a'.repeat(64), NEW = 'b'.repeat(64);
const base = { id: AID, toolName: 'team_delegate', status: 'pending', agentId: 'lead', category: 'other', truncated: false, requestedAt: '2026-10-28T10:00:00Z', expiresAt: '2026-10-29T10:00:00Z', decidedAt: null, executedAt: null, resultPreview: null, error: null, paramsPreview: {}, maskedFields: [], runScope: null };

test('contract: Change the task sends exactly paramsHash and a request of 1 to 12000 characters', () => {
  const path = `/api/approvals/${AID}/request`;
  assert.equal(approvalRoute(path), true);
  assert.equal(TASK_MAX, 12000);
  assert.equal(allowedApproval('POST', path, { paramsHash: OLD, request: 'Only the footer.' }), true);
  assert.equal(allowedApproval('POST', path, { paramsHash: OLD, request: 'x'.repeat(12000) }), true);
  for (const body of [{ paramsHash: OLD, request: 'x'.repeat(12001) }, { paramsHash: OLD, request: '' }, { paramsHash: OLD, request: '  \n' }, { paramsHash: OLD, request: 'x', agent_id: 'other' },
    { paramsHash: OLD }, { request: 'x' }, { paramsHash: 'zz', request: 'x' }, { paramsHash: OLD, request: { agent_id: 'other' } }, undefined]) assert.equal(allowedApproval('POST', path, body), false, JSON.stringify(body));
  assert.equal(allowedApproval('PUT', path, { paramsHash: OLD, request: 'x' }), false);
  assert.equal(allowedApproval('GET', path, undefined), false);
  assert.equal(taskText('ok'), true); assert.equal(taskText(' '), false); assert.equal(taskText(5), false);
  const ok = approvalResponse(path, 200, { approval: { ...base, sessionId: CID, params: { agent_id: 'qa', request: 'Only the footer.' }, paramsHash: NEW, editedAt: '2026-10-28T10:05:00Z', verificationRequired: false } });
  assert.equal(ok.approval.paramsHash, NEW); assert.equal(ok.approval.editedAt, '2026-10-28T10:05:00Z'); assert.equal(ok.approval.params.request, 'Only the footer.');
  assert.throws(() => approvalResponse(path, 200, { approval: { ...base, id: 'b1b2c3d4-0000-4000-8000-000000000001', params: {}, paramsHash: NEW } }), /protocol/, 'another approval\'s answer is refused');
  assert.throws(() => approvalResponse(path, 200, { approval: { ...base, params: {}, paramsHash: NEW, editedAt: 5 } }), /protocol/);
  assert.deepEqual(approvalResponse(path, 400, { error: 'x' }), { code: 'invalid_request' });
  assert.deepEqual(approvalResponse(path, 409, { error: 'x' }), { code: 'approval_changed' });
  assert.deepEqual(approvalResponse(path, 403, {}), { code: 'forbidden' });
  // A list row without editedAt (older server) still reads.
  assert.equal(approvalResponse('/api/approvals?status=pending', 200, { approvals: [base] }).approvals[0].editedAt, undefined);
});

test('taskOf reads a hand-off\'s request only', () => {
  assert.equal(taskOf({ toolName: 'team_delegate', params: { agent_id: 'qa', request: 'Hi' } }), 'Hi');
  assert.equal(taskOf({ toolName: 'telegram_send', params: { request: 'Hi' } }), null);
  assert.equal(taskOf({ toolName: 'team_delegate', params: { request: 5 } }), null);
  assert.equal(taskOf(null), null);
});

/** A fake client: the stored approval changes only through POST /request (with the hash it holds now). */
function fakeClient({ editStatus = 200, toolName = 'team_delegate', maskedFields = [] } = {}) {
  const sent = [];
  let stored = { ...base, toolName, sessionId: CID, params: { agent_id: 'qa', request: 'Check the hero' }, paramsHash: OLD, maskedFields };
  return { sent, stored: () => stored, request: async req => {
    sent.push(req);
    if (req.method === 'GET') return { status: 200, body: { approval: stored } };
    if (req.path.endsWith('/request')) {
      if (editStatus !== 200) { if (editStatus === 409) stored = { ...stored, paramsHash: 'c'.repeat(64) }; return { status: editStatus, body: { code: 'x' } }; }
      assert.equal(req.body.paramsHash, stored.paramsHash, 'the change names the hash it saw');
      stored = { ...stored, params: { ...stored.params, request: req.body.request }, paramsHash: NEW, editedAt: '2026-10-28T10:05:00Z' };
      return { status: 200, body: { approval: stored } };
    }
    return { status: 200, body: {} };
  } };
}
async function mount(t, el) {
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  t.after(async () => { await act(async () => root.unmount()); container.remove(); });
  await act(async () => { root.render(el); });
  await act(async () => {});
  return { container, root };
}
const button = (c, label) => [...c.querySelectorAll('button')].find(b => b.textContent === label);
const call = { id: 'h1', name: 'team_delegate', input: JSON.stringify({ agent_id: 'qa', request: 'Check the hero' }), running: false, approvalId: AID };
const names = id => (id === 'qa' ? 'QA Tester' : id ?? 'Lead');
const type = async (container, text) => { const input = container.querySelector('.doc-input'); await act(async () => { input.textContent = text; input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }); };

test('Change the task… opens the editor with the request; Save replaces it and Allow once sends the new hash', async t => {
  const client = fakeClient();
  const { container } = await mount(t, React.createElement(MomentsContext.Provider, { value: { client, conversationId: CID, agentName: names } }, React.createElement(DelegationCard, { call })));
  const actions = [...container.querySelectorAll('.moment-actions button')].map(b => b.textContent);
  assert.deepEqual(actions.slice(0, 3), ['Allow once', 'Deny', 'Change the task…'], 'the CH6 board order');
  await act(async () => { button(container, 'Change the task…').click(); });
  const editor = container.querySelector('dialog.document-editor');
  assert.ok(editor, 'the long-text editor opens');
  assert.equal(editor.querySelector('.doc-input').textContent, 'Check the hero', 'prefilled with the request');
  assert.match(editor.textContent, /Allow once runs only the saved text/);
  await type(container, 'Only check the footer links.');
  await act(async () => { button(container, 'Save the task').click(); });
  await act(async () => {});
  const edit = client.sent.find(r => r.method === 'POST' && r.path.endsWith('/request'));
  assert.deepEqual(edit.body, { paramsHash: OLD, request: 'Only check the footer links.' }, 'only the request, with the hash that was shown');
  assert.equal(allowedApproval('POST', edit.path, edit.body), true);
  assert.equal(container.querySelector('dialog.document-editor'), null, 'the editor closes');
  assert.equal(container.querySelector('.handoff-ask').textContent, 'Only check the footer links.', 'the card shows the new text');
  assert.match(container.querySelector('.handoff-changed').textContent, /You changed the task/);
  assert.ok([...container.querySelectorAll('dd')].some(d => d.textContent === 'Only check the footer links.'), 'the reviewed details are the new ones');
  await act(async () => { button(container, 'Allow once').click(); });
  await act(async () => {});
  const approve = client.sent.find(r => r.path.endsWith('/approve'));
  assert.deepEqual(approve.body, { paramsHash: NEW }, 'Allow once covers the edited text only');
});

test('Cancel keeps the request; an empty task is not sent; a request that changed meanwhile is read again', async t => {
  const client = fakeClient({ editStatus: 409 });
  const { container } = await mount(t, React.createElement(MomentsContext.Provider, { value: { client, conversationId: CID, agentName: names } }, React.createElement(DelegationCard, { call })));
  await act(async () => { button(container, 'Change the task…').click(); });
  await type(container, 'Something else');
  await act(async () => { button(container, 'Cancel').click(); });
  assert.equal(container.querySelector('dialog.document-editor'), null);
  assert.equal(client.sent.filter(r => r.path.endsWith('/request')).length, 0, 'Cancel sends nothing');
  assert.equal(container.querySelector('.handoff-ask').textContent, 'Check the hero');
  await act(async () => { button(container, 'Change the task…').click(); });
  await type(container, '   ');
  await act(async () => { button(container, 'Save the task').click(); });
  assert.equal(client.sent.filter(r => r.path.endsWith('/request')).length, 0, 'an empty task is not sent');
  assert.match(container.querySelector('.doc-status').textContent, /Write the task first/);
  await type(container, 'New text');
  await act(async () => { button(container, 'Save the task').click(); });
  await act(async () => {});
  assert.equal(client.sent.filter(r => r.path.endsWith('/request')).length, 1);
  assert.match(container.textContent, /the task was not changed/);
  await act(async () => { button(container, 'Allow once').click(); });
  await act(async () => {});
  assert.equal(client.sent.find(r => r.path.endsWith('/approve')).body.paramsHash, 'c'.repeat(64), 'Allow once uses the hash read again, never the old one');
});

test('no Change the task for other tools; disabled while part of the task is hidden', async t => {
  const other = fakeClient({ toolName: 'telegram_send' });
  const plain = { ...call, name: 'telegram_send', input: '{}' };
  const a = await mount(t, React.createElement(MomentsContext.Provider, { value: { client: other, conversationId: CID } }, React.createElement(ApprovalCard, { call: plain })));
  assert.ok(button(a.container, 'Allow once'));
  assert.equal(button(a.container, 'Change the task…'), undefined);
  const hidden = fakeClient({ maskedFields: ['request'] });
  const b = await mount(t, React.createElement(MomentsContext.Provider, { value: { client: hidden, conversationId: CID } }, React.createElement(ApprovalCard, { call })));
  assert.equal(button(b.container, 'Change the task…').disabled, true);
});
