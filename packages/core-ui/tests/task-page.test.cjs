// TASKPAGE-02: the full task page — the wire contract, the controller (page, activity, diffs,
// people, release, sub-tasks, links, follow, checklist owners, save by itself) and the page.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { allowedBoard, boardResponse } = require('../src/board-contract.js');
const { BoardController } = require('../src/board.ts');
const { TaskBoard } = require('../src/TaskBoard.tsx');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { allowed, project } = require('../scripts/application-server.cjs');

const B = '/api/boards/b1/cards/c1';
const PAGE = { openedBy: { kind: 'user', id: 'u1', name: 'Mohamed', extra: 1 }, openedAt: '2026-10-27T10:00:00.000Z',
  people: [{ kind: 'user', id: 'u2', name: 'Sara', role: 'checks' }, { kind: 'agent', id: 'a-dev', name: 'Backend Lead', role: 'does' }, { kind: 'agent', id: '../x', name: 'bad', role: 'does' }],
  team: [{ id: 'u1', name: 'Mohamed' }, { id: 'u2', name: 'Sara' }], parent: { id: 'p1', boardId: 'b1', title: 'Desktop app 1.0', done: false },
  subtasks: [{ id: 's1', boardId: 'b1', title: 'Release note', done: true }], waitsFor: [{ id: 'w1', boardId: 'b1', title: 'Windows machine', done: false }], blocks: [],
  release: 'Nabu', following: true, followers: 2, chats: [{ id: 'chat-12345678', title: 'Sign-in bug' }],
  spent: [{ app: 'Claude Code', model: 'subscription:claude', paid: false, tokens: 31000, replies: 3 }], files: { count: 3, added: 46, removed: 7, paths: ['src/auth/token.ts'] },
  development: { branch: 'fix-sign-in', pr: { number: 71, title: 'Fix sign-in', state: 'open', url: 'https://github.com/o/r/pull/71', checks: 'passing' } } };
const ITEMS = [
  { id: 'a:1', kind: 'event', at: '2026-10-27T10:00:00.000Z', actor: { kind: 'user', id: 'u1', name: 'You' }, event: 'moved', detail: 'In progress' },
  { id: 'm:m1', kind: 'reply', at: '2026-10-27T11:00:00.000Z', actor: { kind: 'agent', id: 'a-dev', name: 'Backend Lead' }, app: 'Claude Code', model: 'subscription:claude', chat: { id: 'chat-12345678', title: 'Sign-in bug' },
    text: 'I found it: refresh a minute early.', more: false, tokens: 2100, change: { messageId: 'm1', files: 1, added: 2, removed: 1, undone: false } },
  { id: 'c:1', kind: 'comment', at: '2026-10-27T12:00:00.000Z', actor: { kind: 'agent', id: 'a-qa', name: 'QA Tester' }, text: 'Passes on macOS.' },
  { id: 'l:0', kind: 'log', at: '2026-10-27T13:00:00.000Z', app: 'Codex', text: 'added the edge test' },
  { id: 'x', kind: 'secret', at: '' },
];
const DIFF = [{ path: 'src/auth/token.ts', status: 'M', added: 2, removed: 1, lines: [' const a = 1;', '-if (expired) refresh();', '+if (expiresSoon) refresh();'], more: false }];

test('contract: the page routes and bodies pass; nothing else', () => {
  const ok = [['GET', `${B}/page`], ['GET', `${B}/activity`], ['GET', `${B}/activity?before=2026-10-27T10:00:00.000Z`], ['GET', `${B}/activity/m1/diff`],
    ['PUT', `${B}/people`, { kind: 'user', id: 'u2', role: 'checks' }], ['PUT', `${B}/people`, { kind: 'agent', id: 'a-dev', role: null }], ['PUT', `${B}/release`, { name: 'Nabu' }], ['PUT', `${B}/release`, { name: null }],
    ['POST', `${B}/subtasks`, { title: 'x' }], ['PUT', `${B}/links`, { waitsFor: 'w1', on: true }], ['PUT', `${B}/follow`, { on: false }],
    ['PUT', `${B}/checklist/i1`, { owner: { kind: 'agent', id: 'a-dev' }, dueDate: '2026-10-31' }], ['PUT', `${B}/checklist/i1`, { beforeItemId: null }]];
  for (const [m, p, b] of ok) { assert.ok(allowedBoard(m, p, b), `${m} ${p}`); assert.ok(allowedRequest(m, p, b), `session ${m} ${p}`); assert.ok(allowed(m, p, b), `bridge ${m} ${p}`); }
  const no = [['PUT', `${B}/people`, { kind: 'user', id: 'u2', role: 'boss' }], ['PUT', `${B}/people`, { kind: 'team', id: 'u2', role: 'does' }], ['PUT', `${B}/people`, { kind: 'user', id: 'u2' }],
    ['GET', `${B}/activity?before=yesterday`], ['POST', `${B}/page`, {}], ['PUT', `${B}/links`, { waitsFor: '../x', on: true }], ['PUT', `${B}/follow`, { on: 'yes' }],
    ['PUT', `${B}/checklist/i1`, { owner: { kind: 'agent' } }], ['PUT', `${B}/release`, { name: 'x'.repeat(61) }]];
  for (const [m, p, b] of no) assert.equal(allowedBoard(m, p, b), false, `${m} ${p} ${JSON.stringify(b)}`);
});

test('contract: page, activity and diff come back with their own fields, the same on a second pass', () => {
  const p = boardResponse(`${B}/page`, 200, { page: PAGE });
  assert.deepEqual(p.page.people.map(x => x.id), ['u2', 'a-dev']);
  assert.equal(p.page.openedBy.extra, undefined);
  assert.deepEqual(boardResponse(`${B}/page`, 200, p), p);
  assert.deepEqual(project(`${B}/page`, 200, { page: PAGE }), p, 'the bridge projects it the same way');
  assert.equal(boardResponse(`${B}/page`, 200, { page: { ...PAGE, development: { branch: 'x', pr: { ...PAGE.development.pr, url: 'https://evil.example/x' } } } }).page.development.pr.url, '');
  const a = boardResponse(`${B}/activity`, 200, { items: ITEMS, more: true, extra: 1 });
  assert.deepEqual(a.items.map(x => x.kind), ['event', 'reply', 'comment', 'log']);
  assert.deepEqual(boardResponse(`${B}/activity`, 200, a), a);
  const d = boardResponse(`${B}/activity/m1/diff`, 200, { files: DIFF });
  assert.deepEqual(d.files[0].lines, DIFF[0].lines);
  assert.deepEqual(boardResponse(`${B}/activity/m1/diff`, 200, d), d);
  assert.deepEqual(boardResponse(`${B}/checklist`, 200, { items: [{ id: 'i1', text: 't', done: false, owner: { kind: 'agent', id: 'a-dev' }, dueDate: '2026-10-31' }, { id: 'i2', text: 'u', done: true, owner: { kind: 'x' } }] }).items.map(i => [i.owner, i.dueDate]),
    [[{ kind: 'agent', id: 'a-dev' }, '2026-10-31'], [null, null]]);
});

async function fixture() {
  const base = createLoginMock(), calls = [];
  const client = new SessionClient({ mock: async (r) => {
    calls.push(r);
    const m = /^\/api\/boards\/([^/]+)\/cards\/([^/]+)\/(page|activity|people|release|subtasks|links|follow)/.exec(r.path);
    if (m && m[3] === 'page') return { status: 200, body: { page: PAGE } };
    if (m && m[3] === 'activity' && r.path.endsWith('/diff')) return { status: 200, body: { files: DIFF } };
    if (m && m[3] === 'activity') return { status: 200, body: { items: ITEMS.slice(0, 4), more: false } };
    if (m && m[3] === 'people') return { status: 200, body: { people: PAGE.people.slice(0, 2) } };
    if (m && m[3] === 'release') return { status: 200, body: { release: r.body.name } };
    if (m && m[3] === 'links') return { status: 200, body: { ok: true } };
    if (m && m[3] === 'follow') return { status: 200, body: { following: r.body.on } };
    return base(r);
  } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const b = new BoardController(client);
  await b.load();
  await b.addCard(b.getSnapshot().columns[0].id, 'Fix the sign-in timeout');
  const card = b.getSnapshot().cards[0];
  await b.openCard(card.id);
  for (let i = 0; i < 40 && (b.getSnapshot().page?.phase !== 'ready' || b.getSnapshot().activity?.phase !== 'ready'); i++) await new Promise(r => setTimeout(r, 5));
  return { b, calls, card };
}

test('controller: opening a task reads its page and activity; changes go to their routes and read it again', async () => {
  const { b, calls, card } = await fixture();
  assert.equal(b.getSnapshot().page.data.release, 'Nabu');
  assert.equal(b.getSnapshot().activity.items.length, 4);
  await b.loadDiff('m1');
  assert.equal(b.getSnapshot().diffs.m1[0].path, 'src/auth/token.ts');
  await b.setPerson('user', 'u2', 'tests');
  assert.deepEqual(calls.find(c => c.path.endsWith('/people')).body, { kind: 'user', id: 'u2', role: 'tests' });
  await b.setRelease('  Apkallu ');
  assert.deepEqual(calls.find(c => c.path.endsWith('/release')).body, { name: 'Apkallu' });
  await b.setLink('w1', true); await b.setFollow(false);
  assert.deepEqual(calls.find(c => c.path.endsWith('/links')).body, { waitsFor: 'w1', on: true });
  const before = calls.filter(c => c.path.endsWith('/page')).length;
  assert.equal(await b.saveField({ priority: 'high' }), true, 'one field saves at once');
  assert.equal(b.getSnapshot().cards.find(c => c.id === card.id).priority, 'high');
  for (let i = 0; i < 20 && calls.filter(c => c.path.endsWith('/page')).length === before; i++) await new Promise(r => setTimeout(r, 5));
  assert.ok(calls.filter(c => c.path.endsWith('/page')).length > before, 'the page is read again');
  assert.equal(b.getSnapshot().notice, undefined, 'no “Saved.” notice for a quiet save');
  b.closeCard();
  assert.equal(b.getSnapshot().page, undefined);
  b.dispose();
});

test('page: the middle and the side show what the board drew', async () => {
  const { b } = await fixture();
  await b.loadDiff('m1');
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { controller: b, onOpenChat: () => {} }));
  for (const words of ['Back to the board', 'opened it', 'Add a sub-task', 'Checklist', 'Activity', 'Comments', 'Replies', 'Changes', 'moved it to <b>In progress</b>', 'replied in',
    'changed 1 file', 'Undo these changes', 'Passes on macOS', 'added the edge test', 'Write a comment', 'aria-label="People"', 'Sara', 'checks it', 'Release', 'Nabu', 'Part of', 'Desktop app 1.0',
    'Waits for', 'Windows machine', 'Sub-tasks', '1 of 1', 'fix-sign-in', 'PR #71 ✓', 'Files changed', 'Tokens', '31k · on your subscription', 'Chats', 'Sign-in bug', 'Following', 'Repeats', 'Never', 'Details', 'Links', 'Work', 'More: archive', '+ Label'])
    assert.ok(html.includes(words), words);
  assert.doesNotMatch(html, /Save changes/);
  b.dispose();
});

test('TASKPAGE-03: Repeats (contract, controller, card line) and the All · Tasks · Scheduled filter', async () => {
  const { matches, repeatWords } = require('../src/board.ts');
  for (const b of [{ every: 'daily', at: '09:00' }, { every: 'weekly', at: '08:00', weekday: 1, agentId: 'a-dev', model: 'subscription:codex', paused: true }, { every: 'hourly', at: '00:15' }, { every: 'never' }])
    assert.ok(allowedBoard('PUT', `${B}/schedule`, b) && allowedRequest('PUT', `${B}/schedule`, b) && allowed('PUT', `${B}/schedule`, b), JSON.stringify(b));
  for (const b of [{ every: 'weekly', at: '08:00' }, { every: 'daily', at: '9am' }, { every: 'never', at: '09:00' }, { every: 'monthly', at: '09:00' }, { every: 'daily', at: '09:00', extra: 1 }])
    assert.equal(allowedBoard('PUT', `${B}/schedule`, b), false, JSON.stringify(b));
  assert.ok(allowedBoard('GET', `${B}/schedule`));
  const R = { every: 'daily', at: '09:00', weekday: null, nextRun: '2026-10-30T08:00:00.000Z', paused: false, lastResult: 'started', secret: 1 };
  const card = boardResponse('/api/boards/b1/cards/c1', 200, { ...{ id: 'c1', columnId: 'col1', title: 'x', priority: 'normal', position: 1, version: 1, agents: [], departments: [] }, repeat: R });
  assert.deepEqual(card.repeat, { every: 'daily', at: '09:00', weekday: null, nextRun: '2026-10-30T08:00:00.000Z', paused: false, lastResult: 'started' });
  assert.deepEqual(boardResponse('/api/boards/b1/cards/c1', 200, card), card);
  assert.deepEqual(boardResponse(`${B}/schedule`, 200, { schedule: null }), { schedule: null });
  assert.deepEqual([repeatWords({ every: 'hourly', at: '00:15' }), repeatWords({ every: 'daily', at: '09:00' }), repeatWords({ every: 'weekly', at: '08:00', weekday: 1 })], ['Every hour at :15', 'Every day 09:00', 'Every week Mon 08:00']);
  const f = { text: '', agent: '', department: '' };
  assert.equal(matches(card, { ...f, kind: 'scheduled' }), true);
  assert.equal(matches(card, { ...f, kind: 'tasks' }), false);
  assert.equal(matches({ ...card, repeat: null }, { ...f, kind: 'scheduled' }), false);
  const { b, calls, card: open } = await fixture();
  const ok = await b.setSchedule({ every: 'weekly', at: '08:00', weekday: 1, agentId: 'a-dev', model: 'subscription:codex' });
  assert.equal(ok, false, 'the mock has no schedule route: nothing is saved, and the request was well formed');
  assert.deepEqual(calls.find(c => c.path.endsWith('/schedule') && c.method === 'PUT').body, { every: 'weekly', at: '08:00', weekday: 1, agentId: 'a-dev', model: 'subscription:codex', paused: false });
  await b.setSchedule(null);
  assert.deepEqual(calls.filter(c => c.path.endsWith('/schedule') && c.method === 'PUT').at(-1).body, { every: 'never' });
  b.closeCard();
  b.setFilter({ kind: 'scheduled' });
  const html = renderToStaticMarkup(React.createElement(TaskBoard, { controller: b }));
  assert.match(html, /aria-label="Show tasks"/);
  assert.match(html, /aria-pressed="true">Scheduled/);
  assert.ok(open);
  b.dispose();
});
