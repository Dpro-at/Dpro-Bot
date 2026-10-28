// CH6/CH10 other team moments: you said no (Allow now), a hand-off ran out of time (Hand it again),
// a person cannot answer (Set a model), and stop asking for one person (What agents may do).
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('../../backend/node_modules/jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
const React = require('../node_modules/react'); const { act } = React;
const { createRoot } = require('../node_modules/react-dom/client');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { ApprovalCard, DelegationCard, MomentsContext, alwaysAllow, handOffFailure, DENY_UNDO_MS } = require('../src/ChatMoments.tsx');
const CID = '3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b';
const AID = 'a1b2c3d4-0000-4000-8000-000000000001';
const HASH = 'a'.repeat(64);

const handOff = (output, extra = {}) => ({ id: 'h1', name: 'team_delegate', input: JSON.stringify({ agent_id: 'qa', request: 'Check the hero at 390 px' }), output, isError: true, running: false, ms: 240000, ...extra });
const names = id => (id === 'qa' ? 'QA Tester' : id ?? 'Lead');
/** A fake session client: the stored approval, and every request it was sent. */
function fakeClient(status = 'pending', approval = {}) {
  const sent = [];
  return { sent, request: async req => {
    sent.push(req);
    if (req.method === 'GET') return { status: 200, body: { approval: { id: AID, toolName: 'team_delegate', sessionId: CID, status, paramsHash: HASH, params: { agent_id: 'qa', request: 'Check the hero' }, agentId: 'lead', category: 'other', ...approval } } };
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

test('the hand-off receipt names why it did not finish; anything else is no reason', () => {
  assert.equal(handOffFailure(handOff('Team request did not finish (timed_out): the agent ran out of time (4 minutes). Nothing runs again by itself; tell the owner.')), 'timed_out');
  assert.equal(handOffFailure(handOff('Team request did not finish (no_model): the agent has no model set.')), 'no_model');
  assert.equal(handOffFailure(handOff('Team request did not finish (model_unavailable): x')), 'model_unavailable');
  assert.equal(handOffFailure(handOff('Team request could not run. Check the selected agent.')), null);
  assert.equal(handOffFailure(handOff('{"answer":"Team request did not finish (timed_out): "}')), null, 'only the receipt\'s own first words count');
  assert.equal(handOffFailure({ ...handOff('Team request did not finish (timed_out): x'), name: 'exec' }), null, 'only a hand-off');
  assert.equal(handOffFailure(handOff('Team request did not finish (timed_out): x', { running: true })), null);
});

test('a hand-off that ran out of time: one sentence and Hand it again, which only drafts a message to the lead', async t => {
  const drafts = [];
  const call = handOff('Team request did not finish (timed_out): the agent ran out of time (4 minutes). Nothing runs again by itself; tell the owner.');
  const { container } = await mount(t, React.createElement(MomentsContext.Provider, { value: { agentName: names, onDraft: d => drafts.push(d) } }, React.createElement(DelegationCard, { call })));
  assert.match(container.querySelector('.handoff-state').textContent, /^Ran out of time · 4m 00s/);
  const moment = container.querySelector('.team-moment');
  assert.equal(moment.querySelector('p').textContent, 'QA Tester ran out of time.');
  assert.equal(moment.querySelectorAll('.moment-main').length, 1, 'at most one main action');
  assert.equal(container.querySelector('.handoff-fold'), null, 'the receipt is not shown as a report');
  await act(async () => { button(moment, 'Hand it again').click(); });
  assert.deepEqual(drafts, ['Hand this to QA Tester again: Check the hero at 390 px']);
});

test('a person who cannot answer: Set a model opens that agent; without the callback no action shows', async t => {
  const opened = [];
  const call = handOff('Team request did not finish (no_model): the agent has no model set. Nothing runs again by itself; tell the owner.', { ms: 20 });
  const { container } = await mount(t, React.createElement(MomentsContext.Provider, { value: { agentName: names, onOpenAgent: id => opened.push(id) } }, React.createElement(DelegationCard, { call })));
  assert.equal(container.querySelector('.team-moment p').textContent, 'QA Tester cannot answer: no model is set.');
  assert.match(container.querySelector('.handoff-state').textContent, /^Cannot answer/);
  await act(async () => { button(container, 'Set a model').click(); });
  assert.deepEqual(opened, ['qa']);
  const other = renderToStaticMarkup(React.createElement(MomentsContext.Provider, { value: { agentName: names } }, React.createElement(DelegationCard, { call: handOff('Team request did not finish (model_unavailable): x') })));
  assert.match(other, /QA Tester cannot answer: its model is not available\./);
  assert.doesNotMatch(other, /moment-main/);
});

test('you said no: Allow now while the no is not sent yet allows it with the reviewed request; no deny is sent', async t => {
  const client = fakeClient();
  const call = { id: 'c', name: 'team_delegate', input: '{}', running: false, approvalId: AID };
  const { container } = await mount(t, React.createElement(MomentsContext.Provider, { value: { client, conversationId: CID } }, React.createElement(ApprovalCard, { call, who: 'The lead', what: 'hand this to QA Tester' })));
  assert.ok(button(container, 'Allow once'), 'reviewed at once');
  await act(async () => { button(container, 'Deny').click(); });
  assert.equal(container.querySelector('.team-moment p').textContent, 'You said no: hand this to QA Tester.');
  assert.ok(DENY_UNDO_MS > 0);
  assert.equal(client.sent.filter(r => r.method === 'POST').length, 0, 'the no waits for its few seconds');
  await act(async () => { button(container, 'Allow now').click(); });
  await act(async () => {});
  const posts = client.sent.filter(r => r.method === 'POST');
  assert.deepEqual(posts.map(r => r.path), [`/api/approvals/${AID}/approve`]);
  assert.equal(posts[0].body.paramsHash, HASH);
  assert.match(container.textContent, /Allowed: /);
});

test('you said no: leaving the chat sends the no at once; a no already sent is final (no Allow now)', async t => {
  const client = fakeClient();
  const call = { id: 'c', name: 'team_delegate', input: '{}', running: false, approvalId: AID };
  const { root, container } = await mount(t, React.createElement(MomentsContext.Provider, { value: { client, conversationId: CID } }, React.createElement(ApprovalCard, { call })));
  await act(async () => { button(container, 'Deny').click(); });
  await act(async () => root.render(React.createElement('div')));
  assert.deepEqual(client.sent.filter(r => r.method === 'POST').map(r => r.path), [`/api/approvals/${AID}/deny`]);
  const denied = fakeClient('denied');
  const again = await mount(t, React.createElement(MomentsContext.Provider, { value: { client: denied, conversationId: CID } }, React.createElement(ApprovalCard, { call, what: 'hand this to QA Tester' })));
  assert.equal(again.container.textContent, 'You said no: hand this to QA Tester. It did not run.');
  assert.equal(button(again.container, 'Allow now'), undefined);
});

test('stop asking for one person opens What agents may do for that agent and action; hand-offs always ask', () => {
  const opened = [];
  const item = alwaysAllow({ agentId: 'qa', category: 'browser' }, (a, c) => opened.push([a, c]));
  assert.equal(item.label, 'Always allow this… (What agents may do)'); assert.ok(!item.disabled);
  item.run(); assert.deepEqual(opened, [['qa', 'browser']]);
  const handOffItem = alwaysAllow({ agentId: 'lead', category: 'other' }, () => opened.push('x'));
  assert.equal(handOffItem.disabled, true); assert.match(handOffItem.label, /no rule can allow this/);
  assert.equal(alwaysAllow(null, () => {}).disabled, true, 'not read yet');
  assert.equal(opened.length, 1);
});
