// CHAT-BUILD-01 stage 1 (UI side): paged conversations, notices, honest refusals, same-runId retry.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { allowedConversation: allow, conversationResponse, projectRunEvent, MAX_MESSAGE_BYTES } = require('../src/conversation-contract.js');
const { SessionClient } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { ConversationsController, withAttachments, PAGE_LIMIT } = require('../src/conversations.ts');
const CID = '3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b';
const MID = '019a2b3c-4d5e-7f60-8a1b-2c3d4e5f6a7b';

test('the messages route takes one page (limit, before); anything else is refused', () => {
  assert.equal(allow('GET', `/api/chat/conversations/${CID}/messages?limit=100`, undefined), true);
  assert.equal(allow('GET', `/api/chat/conversations/${CID}/messages?limit=100&before=${MID}`, undefined), true);
  assert.equal(allow('GET', `/api/chat/conversations/${CID}/messages?limit=0`, undefined), false);
  assert.equal(allow('GET', `/api/chat/conversations/${CID}/messages?limit=900`, undefined), false);
  assert.equal(allow('GET', `/api/chat/conversations/${CID}/messages?before=${MID}`, undefined), false);
  assert.equal(allow('GET', `/api/chat/conversations/${CID}/messages?limit=5&before=../x`, undefined), false);
  const body = { conversation: { id: CID, title: 'T', agentId: null, projectId: null, pinned: false, preview: '', createdAt: '', updatedAt: '' }, messages: [], activeRunId: null, hasMore: true };
  assert.equal(conversationResponse(`/api/chat/conversations/${CID}/messages?limit=100`, 200, body).hasMore, true);
  assert.equal(conversationResponse(`/api/chat/conversations/${CID}/messages?limit=100`, 200, { ...body, hasMore: 'yes' }).hasMore, undefined);
});

test('notices pass the run contract; unknown notice codes are dropped', () => {
  assert.deepEqual(projectRunEvent({ seq: 1, type: 'notice', code: 'rate_limited', waitSec: 30, at: 5 }), { seq: 1, type: 'notice', code: 'rate_limited', waitSec: 30, at: 5 });
  assert.equal(projectRunEvent({ seq: 2, type: 'notice', code: 'anything' }), undefined);
});

test('an Arabic message of 100,000 characters fits the request limit; control characters in files are dropped', () => {
  const arabic = 'م'.repeat(100000);
  assert.ok(new TextEncoder().encode(JSON.stringify({ runId: 'run-12345678', message: arabic })).length < MAX_MESSAGE_BYTES);
  const text = withAttachments('see file', [{ name: 'log.txt', text: 'a\u0000b\u0007c\td\ne' }]);
  assert.match(text, /abc\td\ne/);
  assert.equal(allow('POST', `/api/chat/conversations/${CID}/runs`, { runId: 'run-12345678', message: text }), true);
  assert.equal(PAGE_LIMIT, 100);
});

async function chat(t, hook) {
  const base = createLoginMock();
  const calls = [];
  const client = new SessionClient({ mock: async request => { calls.push(request); return (await hook?.(request, base)) ?? base(request); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const controller = new ConversationsController(client); t.after(() => controller.dispose());
  await controller.load();
  return { controller, calls };
}

test('a too-long message is never dropped silently: the reason shows and the text stays', async t => {
  const { controller, calls } = await chat(t);
  controller.edit('x'.repeat(100001));
  assert.match(controller.getSnapshot().notice, /at most 100,000 characters/);
  controller.edit('hello');
  await controller.send('y'.repeat(100001));
  assert.match(controller.getSnapshot().notice, /too long to send/);
  assert.ok(!calls.some(c => c.method === 'POST' && /\/runs$/.test(c.path)));
});

test('a lost answer to a send is retried with the same runId', async t => {
  let failures = 1;
  const { controller, calls } = await chat(t, async (request) => {
    if (request.method === 'POST' && /\/runs$/.test(request.path) && failures-- > 0) throw new TypeError('network');
    return undefined;
  });
  await controller.send('Hello there');
  const runs = calls.filter(c => c.method === 'POST' && /\/runs$/.test(c.path));
  assert.ok(runs.length >= 2, `retried (${runs.length})`);
  assert.equal(new Set(runs.map(r => r.body.runId)).size, 1, 'one runId for every try');
  assert.equal(controller.getSnapshot().notice, undefined);
});
