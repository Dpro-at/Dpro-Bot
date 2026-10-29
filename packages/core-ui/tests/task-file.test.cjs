// TASKLOG-01: one task file per project — the wire contract (card marks, the task, Continue, the
// switch), the board filter by app, the controller's Continue, and the page wiring.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { allowedBoard, boardResponse, boardRoute, TASK_CONTINUE_PATH } = require('../src/board-contract.js');
const { allowedAgentRules, agentRulesResponse } = require('../src/agent-rules-contract.js');
const { BoardController, matches } = require('../src/board.ts');
const { appOf } = require('../src/BoardTaskFile.tsx');
const { allowedRequest } = require('../src/session.ts');
const { allowed, project } = require('../scripts/application-server.cjs');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const CARD = { id: 'c1', columnId: 'col1', title: 'Fix the build', description: '', priority: 'high', position: 1000, dueDate: null, archived: false, version: 2, agents: ['a-dev'], departments: ['development'], comments: 0, updatedAt: '2026-10-29 10:00:00', type: 'task', startDate: null, cover: null, labels: [], checklist: { done: 0, total: 0 }, conversationId: null };
const MARK = { no: 'T-7', projectId: 'p1', projectName: 'Dpro', problem: null, apps: ['Claude Code', 'Codex', 'Codex', ''], finished: false, secret: 'x' };
const DETAIL = { ...MARK, file: '.girru/tasks.md', text: '## T-7 · Fix the build\n', task: { no: 'T-7', title: 'Fix the build', state: 'In progress', department: 'Development', agent: 'Dev', priority: 'High', done: ['a'], left: ['b'], next: ['c'], workedOn: [], log: [] },
  workedOn: [{ app: 'Codex', agent: 'Dev', date: '2026-10-29', at: '2026-10-29 15:40', what: 'test added' }], log: [{ at: '2026-10-29 15:40', app: 'Codex', what: 'test added' }] };

test('contract: the task route, Continue and the switch pass; nothing else', () => {
  const ok = [['GET', '/api/boards/b1/cards/c1/task'], ['POST', TASK_CONTINUE_PATH, { boardId: 'b1', cardId: 'c1' }], ['POST', TASK_CONTINUE_PATH, { boardId: 'b1', cardId: 'c1', agentId: 'a-dev', model: 'subscription:codex' }]];
  for (const [m, p, b] of ok) { assert.ok(allowedBoard(m, p, b), `${m} ${p}`); assert.ok(allowedRequest(m, p, b), `session ${m} ${p}`); assert.ok(allowed(m, p, b), `bridge ${m} ${p}`); }
  const no = [['POST', '/api/boards/b1/cards/c1/task', {}], ['GET', '/api/boards/b1/cards/../task'], ['POST', TASK_CONTINUE_PATH, { boardId: 'b1' }], ['POST', TASK_CONTINUE_PATH, { boardId: 'b1', cardId: 'c1', extra: 1 }],
    ['POST', TASK_CONTINUE_PATH, { boardId: 'b1', cardId: 'c1', model: 'bad model' }], ['GET', TASK_CONTINUE_PATH]];
  for (const [m, p, b] of no) assert.equal(allowedBoard(m, p, b), false, `${m} ${p} ${JSON.stringify(b)}`);
  assert.ok(boardRoute(TASK_CONTINUE_PATH));
  assert.ok(allowedBoard('POST', '/api/boards/b1/cards/c1/task-sort', { department: 'research' }));
  assert.equal(allowedBoard('POST', '/api/boards/b1/cards/c1/task-sort', { department: 'research', x: 1 }), false);
  assert.deepEqual(boardResponse('/api/boards/b1/cards/c1/task-sort', 200, { boardId: 'b2', secret: 1 }), { boardId: 'b2' });
  assert.ok(allowedAgentRules('PUT', '/api/agent-rules/files/p1/tasks', { on: false }));
  assert.ok(allowedRequest('PUT', '/api/agent-rules/files/p1/tasks', { on: true }));
  for (const b of [{ on: 'yes' }, {}, { on: true, x: 1 }]) assert.equal(allowedAgentRules('PUT', '/api/agent-rules/files/p1/tasks', b), false);
});

test('contract: card marks, the task and Continue come back with their own fields only, the same on a second pass', () => {
  const card = boardResponse('/api/boards/b1/cards/c1', 200, { ...CARD, taskFile: MARK });
  assert.deepEqual(card.taskFile, { no: 'T-7', projectId: 'p1', projectName: 'Dpro', problem: null, apps: ['Claude Code', 'Codex'], finished: false });
  assert.deepEqual(boardResponse('/api/boards/b1/cards/c1', 200, card), card, 'the bridge and the page both apply it');
  assert.equal(boardResponse('/api/boards/b1/cards/c1', 200, { ...CARD, taskFile: { ...MARK, no: 'X-1' } }).taskFile, null);
  assert.equal(boardResponse('/api/boards/b1/cards/c1', 200, CARD).taskFile, null);
  const list = boardResponse('/api/boards', 200, { boards: [{ id: 'b1', name: 'Company board', kind: 'company', cards: 3, open: 2, toSort: 1 }], templates: [], colors: [] });
  assert.equal(list.boards[0].toSort, 1);
  const t = boardResponse('/api/boards/b1/cards/c1/task', 200, { task: DETAIL });
  assert.deepEqual(Object.keys(t.task).sort(), ['apps', 'file', 'finished', 'log', 'no', 'problem', 'projectId', 'projectName', 'task', 'text', 'workedOn']);
  assert.deepEqual(t.task.task.done, ['a']);
  assert.equal(t.task.workedOn[0].what, 'test added');
  assert.deepEqual(boardResponse('/api/boards/b1/cards/c1/task', 200, t), t);
  assert.deepEqual(boardResponse('/api/boards/b1/cards/c1/task', 200, { task: null }), { task: null });
  assert.deepEqual(project('/api/boards/b1/cards/c1/task', 200, { task: DETAIL }), t, 'the bridge projects it the same way');
  const ok = boardResponse(TASK_CONTINUE_PATH, 201, { conversation: { id: 'session-123456' }, extra: 1 });
  assert.deepEqual(ok, { conversation: { id: 'session-123456' } });
  assert.deepEqual(boardResponse(TASK_CONTINUE_PATH, 201, ok), ok);
  assert.deepEqual(boardResponse(TASK_CONTINUE_PATH, 409, { code: 'conversation_busy', error: 'text', conversation: { id: 'session-123456' } }), { code: 'conversation_busy', conversation: { id: 'session-123456' } });
  assert.deepEqual(boardResponse(TASK_CONTINUE_PATH, 400, { error: 'secret text' }), { code: 'not_started', conversation: null });
  const files = agentRulesResponse('/api/agent-rules/files/p1', 200, { files: { projectId: 'p1', folder: '/x', mode: 'private', written: true, upToDate: true, files: [], rules: '', tasks: { on: true, file: '/etc/passwd', open: 2, problems: [{ line: 4, message: 'A task heading needs a number' }, { line: 'x' }] } } });
  assert.deepEqual(files.files.tasks, { on: true, file: '.girru/tasks.md', open: 2, problems: [{ line: 4, message: 'A task heading needs a number' }] });
  assert.deepEqual(agentRulesResponse('/api/agent-rules/files/p1', 200, files).files.tasks, files.files.tasks);
});

test('board: the app filter, the task panel and Continue', async () => {
  const card = { ...CARD, taskFile: { ...MARK, apps: ['Claude Code', 'Codex'] } };
  const f = { text: '', agent: '', department: '' };
  assert.equal(matches(card, { ...f, app: 'codex' }), true);
  assert.equal(matches(card, { ...f, app: 'Gemini' }), false);
  assert.equal(matches({ ...CARD, taskFile: null }, { ...f, app: 'Codex' }), false);
  assert.equal(matches({ ...CARD }, f), true);
  assert.deepEqual([appOf('Claude Code')?.id, appOf('codex')?.id, appOf('Antigravity')?.id, appOf('Girru')], ['subscription:claude', 'subscription:codex', 'subscription:gemini', null]);
  const calls = [];
  const { SessionClient } = require('../src/session.ts');
  const { createLoginMock } = require('../src/session-mock.ts');
  const base = createLoginMock();
  const client = new SessionClient({ mock: async (r) => {
    calls.push(r);
    if (r.method === 'GET' && r.path === '/api/boards') return { status: 200, body: { boards: [{ id: 'b1', name: 'Development board', kind: 'department', departments: ['development'], cards: 1, open: 1, version: 1 }], templates: [], colors: [] } };
    if (r.method === 'POST' && r.path === '/api/boards/sync-departments') return { status: 200, body: { created: 0, departments: 1 } };
    if (r.method === 'GET' && r.path === '/api/boards/b1') return { status: 200, body: { id: 'b1', name: 'Development board', kind: 'department', departments: ['development'], version: 1, columns: [{ id: 'col1', name: 'In progress', position: 1000 }], cards: [card], labels: [] } };
    if (r.path === '/api/boards/b1/cards/c1/task') return { status: 200, body: { task: DETAIL } };
    if (r.path === TASK_CONTINUE_PATH) return { status: 201, body: { conversation: { id: 'session-123456' } } };
    if (/^\/api\/boards\/b1\/(overview|cards\/c1\/(comments|checklist|chat))$/.test(r.path)) return { status: 200, body: r.path.endsWith('/comments') ? { comments: [] } : r.path.endsWith('/checklist') ? { items: [] } : r.path.endsWith('/chat') ? { conversation: null, progress: { running: false, agents: [] } } : { tasks: [], total: 0, limited: false } };
    return base(r);
  } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const c = new BoardController(client);
  await c.load();
  assert.equal(c.getSnapshot().cards[0].taskFile.no, 'T-7');
  await c.openCard('c1');
  for (let i = 0; i < 20 && c.getSnapshot().task?.phase !== 'ready'; i++) await new Promise((r) => setTimeout(r, 5));
  assert.equal(c.getSnapshot().task.detail.task.next[0], 'c');
  const id = await c.continueTask('a-dev', 'subscription:codex');
  assert.equal(id, 'session-123456');
  assert.deepEqual(calls.find((x) => x.path === TASK_CONTINUE_PATH).body, { boardId: 'b1', cardId: 'c1', agentId: 'a-dev', model: 'subscription:codex' });
  c.closeCard();
  assert.equal(c.getSnapshot().task, undefined);
  c.dispose();
});

test('wiring: the card mark, the panel part, the To sort badge, the app filter and the files switch are on the page', () => {
  const board = src('src/TaskBoard.tsx'), part = src('src/BoardTaskPage.tsx'), rules = src('src/AgentRules.tsx');
  assert.match(board, /\{card\.taskFile && <TaskFileMark mark=\{card\.taskFile\}\/>\}/);
  assert.match(board, /openCard&&s\.draft\?<TaskPage key=\{openCard\.id\}/);
  assert.match(board, /b\.toSort/);
  assert.match(board, /aria-label="Filter by app"/);
  assert.match(part, /label="Show it in the task file"/);
  assert.match(part, /aria-label="Send to department"/);
  assert.match(part, /aria-label="Agent who continues"/);
  assert.match(part, /\.continueTask\(agent \|\| undefined, model \|\| undefined\)\.then\(id => \{ if \(id\) onOpenChat\?\.\(id\); \}\)/);
  assert.match(rules, /role="switch" aria-label="Task file"/);
  assert.match(rules, /c\.setTasks\(projectId, e\.target\.checked\)/);
});
