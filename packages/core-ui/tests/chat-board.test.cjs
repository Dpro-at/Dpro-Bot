// CHAT-PRO-02 I step 2: a chat task becomes a board card; the chat shows the card,
// its board updates and who works on it; the card shows the chat it came from.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { BoardController } = require('../src/board.ts');
const { TaskBoard } = require('../src/TaskBoard.tsx');
const { ChatCardsController, activityLine, cardDraftFrom } = require('../src/chat-board.ts');
const { turnSuggestions, withoutPlan } = require('../src/turns.ts');
const { allowedChatBoard, chatBoardResponse, validChatCard } = require('../src/chat-board-contract.js');
const { boardResponse } = require('../src/board-contract.js');
const { allowed } = require('../scripts/application-server.cjs');

const CONV = 'conv-0000000001';
async function fixture(t) {
  const calls = []; const base = createLoginMock();
  const client = new SessionClient({ mock: async r => { calls.push({ method: r.method, path: r.path }); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const cards = new ChatCardsController(client, 0); const board = new BoardController(client);
  t.after(() => { cards.dispose(); board.dispose(); });
  return { cards, board, calls, client };
}

test('contract (browser and bridge): exact paths, strict bodies, GET/POST only', () => {
  const good = [
    ['GET', `/api/chat/conversations/${CONV}/cards`, undefined],
    ['POST', `/api/chat/conversations/${CONV}/cards`, { boardId: 'b1', title: 'Launch', description: 'From the chat', priority: 'high', agents: ['agent-1'], columnId: 'c1', type: 'task' }],
    ['GET', '/api/boards/b1/cards/k1/chat', undefined],
  ];
  const bad = [
    ['PUT', `/api/chat/conversations/${CONV}/cards`, { boardId: 'b1', title: 'x' }], ['DELETE', `/api/chat/conversations/${CONV}/cards`, undefined],
    ['POST', '/api/boards/b1/cards/k1/chat', {}], ['GET', `/api/chat/conversations/${CONV}/cards`, {}],
    ['POST', `/api/chat/conversations/${CONV}/cards`, { title: 'x' }], ['POST', `/api/chat/conversations/${CONV}/cards`, { boardId: 'b1', title: '' }],
    ['POST', `/api/chat/conversations/${CONV}/cards`, { boardId: 'b1', title: 'a\nb' }], ['POST', `/api/chat/conversations/${CONV}/cards`, { boardId: 'b1', title: 'x', conversationId: CONV }],
    ['POST', `/api/chat/conversations/${CONV}/cards`, { boardId: 'b1', title: 'x', agents: ['../x'] }], ['POST', `/api/chat/conversations/${CONV}/cards`, { boardId: 'b1', title: 'x', priority: 'asap' }],
    ['GET', '/api/chat/conversations/x/cards', undefined], ['GET', '/api/boards/b1/cards/k1/chat?x=1', undefined], ['GET', '/api/boards/../cards/k1/chat', undefined],
  ];
  for (const [m, p, b] of good) { assert.equal(allowedChatBoard(m, p, b), true, p); assert.equal(allowedRequest(m, p, b), true, p); assert.equal(allowed(m, p, b), true, `bridge ${p}`); }
  for (const [m, p, b] of bad) { assert.equal(allowedRequest(m, p, b), false, `${m} ${p} ${JSON.stringify(b)}`); assert.equal(allowed(m, p, b), false, `bridge ${m} ${p}`); }
  assert.equal(validChatCard({ boardId: 'b1', title: 'x' }), true);
});

test('responses are projected to reviewed fields; malformed ones are refused', () => {
  const card = { id: 'k1', boardId: 'b1', boardName: 'Company board', title: 'Launch', column: 'To do', columnId: 'c1', done: false, archived: false, priority: 'high', type: 'task', agents: ['agent-1', '../bad'],
    comments: 2, checklist: { done: 1, total: 2 }, createdAt: '2026-10-16 10:00:00', updatedAt: '2026-10-16 10:05:00', secret: 'x',
    activity: [{ id: '0190-aa', kind: 'moved', actorKind: 'agent', actorId: 'agent-1', detail: 'Review', createdAt: '2026-10-16 10:05:00', extra: 1 }] };
  const progress = { running: true, agents: [{ agentId: 'agent-1', replies: 2, lastAt: '2026-10-16 10:05:00', running: true, plan: { done: 1, total: 3, active: 'Draft', steps: [{ title: 'Draft', status: 'active', x: 1 }] }, token: 'x' }] };
  const out = chatBoardResponse(`/api/chat/conversations/${CONV}/cards`, 200, { cards: [card], progress });
  assert.equal(out.cards[0].secret, undefined); assert.deepEqual(out.cards[0].agents, ['agent-1']);
  assert.equal(out.cards[0].activity[0].extra, undefined); assert.equal(out.progress.agents[0].token, undefined);
  assert.deepEqual(out.progress.agents[0].plan.steps, [{ title: 'Draft', status: 'active' }]);
  assert.throws(() => chatBoardResponse(`/api/chat/conversations/${CONV}/cards`, 200, { cards: [{ ...card, activity: [{ kind: 'hacked' }] }], progress }));
  assert.throws(() => chatBoardResponse('/api/boards/b1/cards/k1/chat', 200, { conversation: null }));
  assert.deepEqual(chatBoardResponse('/api/boards/b1/cards/k1/chat', 404, { code: 'not_found', error: 'Card not found' }), { code: 'not_found' });
  assert.equal(chatBoardResponse('/api/boards/b1/cards/k1/chat', 500, { code: 'boom' }), null);
  // The board card carries its conversation id (or null), nothing else new.
  const b = boardResponse('/api/boards/b1/cards/k1', 200, { id: 'k1', columnId: 'c1', title: 't', priority: 'normal', version: 1, position: 1000, agents: [], departments: [], conversationId: CONV });
  assert.equal(b.conversationId, CONV);
  assert.equal(boardResponse('/api/boards/b1/cards/k1', 200, { id: 'k1', columnId: 'c1', title: 't', priority: 'normal', version: 1, position: 1000, agents: [], departments: [], conversationId: '<x>' }).conversationId, null);
});

test('offline: add a chat task to the board; board moves and comments come back to the chat; the card opens its chat', async t => {
  const { cards, board, calls } = await fixture(t);
  assert.equal(cards.getSnapshot().owner, true);
  cards.setConversation(CONV);
  await cards.refresh();
  assert.equal(cards.getSnapshot().cards.length, 0);
  const boardId = await cards.loadBoards();
  assert.ok(boardId);
  assert.ok(cards.getSnapshot().columns.some(c => c.name === 'To do'));
  assert.equal(await cards.create({ boardId, title: '', description: '', priority: 'normal', agents: [] }), false, 'a title is required');
  assert.equal(calls.filter(c => c.method === 'POST' && c.path.endsWith('/cards')).length, 0, 'nothing sent for an invalid card');
  assert.equal(await cards.create({ boardId, title: '  Launch   the newsletter ', description: 'From the chat:\n\nplan it', priority: 'high', agents: ['agent-1', 'agent-1'] }), true);
  let s = cards.getSnapshot();
  assert.equal(s.cards.length, 1);
  const card = s.cards[0];
  assert.deepEqual([card.title, card.column, card.done, card.priority], ['Launch the newsletter', 'To do', false, 'high']);
  assert.deepEqual(card.activity.map(a => a.kind), ['created']);
  assert.deepEqual(s.progress.agents.map(a => [a.agentId, a.replies]), [['agent-1', 0]]);

  // On the board: the card links back to the chat; moving it to Done and commenting shows up in the chat.
  await board.reveal(card.boardId, card.id);
  let bs = board.getSnapshot();
  assert.equal(bs.open, card.id);
  assert.equal(bs.cards.find(c => c.id === card.id).conversationId, CONV);
  await new Promise(r => setTimeout(r, 20));
  assert.deepEqual(board.getSnapshot().chat.conversation, { id: CONV, title: 'Fictional chat' });
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { controller: board, onOpenChat: () => {} }));
  assert.match(html, /Activity/); assert.match(html, /People and agents/); assert.match(html, /Back to the board/);
  await board.move(card.id, bs.columns.find(c => c.name === 'Done').id, null);
  await cards.refresh();
  s = cards.getSnapshot();
  assert.equal(s.cards[0].done, true);
  assert.deepEqual(s.cards[0].activity.map(a => [a.kind, a.detail]), [['created', 'To do'], ['done', 'Done']]);
});

test('helpers: a card draft from the chat, activity lines, agent suggestions hidden from tool work', () => {
  const draft = cardDraftFrom([{ role: 'user', content: 'Plan the launch\nwith the team' }, { role: 'assistant', content: 'ok' }], null);
  assert.equal(draft.title, 'Plan the launch');
  assert.match(draft.description, /^From the chat:\n\nPlan the launch\nwith the team$/);
  assert.equal(cardDraftFrom([], 'Launch plan').title, 'Launch plan');
  const name = id => (id === 'a1' ? 'Writer' : 'Former agent');
  assert.equal(activityLine({ kind: 'moved', actorKind: 'agent', actorId: 'a1', detail: 'Review' }, name), 'Writer moved it to Review');
  assert.equal(activityLine({ kind: 'done', actorKind: 'user', actorId: 'o', detail: 'Done' }, name), 'You marked it done (Done)');
  const parts = [{ kind: 'tools', step: 0, calls: [
    { id: '1', name: 'board_suggest_card', input: JSON.stringify({ title: '  Website  relaunch ', agents: ['@Writer', 7], priority: 'urgent' }), output: 'Card suggestion shown to the owner' },
    { id: '2', name: 'board_suggest_card', input: JSON.stringify({ title: 'Refused' }), output: 'Not suggested', isError: true },
    { id: '3', name: 'read', input: '{}', output: 'x' },
  ] }];
  assert.deepEqual(turnSuggestions(parts).map(s => ({ ...s })), [{ title: 'Website relaunch', description: '', agents: ['Writer'], priority: 'urgent' }]);
  assert.deepEqual(withoutPlan(parts)[0].calls.map(c => c.name), ['read']);
});

test('not the owner: nothing is read or sent', async () => {
  const client = new SessionClient({ mock: createLoginMock() });
  const cards = new ChatCardsController(client, 0);
  cards.setConversation(CONV);
  await cards.refresh();
  assert.equal(cards.getSnapshot().owner, false);
  assert.equal(await cards.create({ boardId: 'b1', title: 'x', description: '', priority: 'normal', agents: [] }), false);
  assert.equal(await cards.loadBoards(), null);
  cards.dispose();
});
