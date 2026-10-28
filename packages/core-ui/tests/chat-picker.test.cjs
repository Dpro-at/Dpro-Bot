// CH5: the project picker of a new chat (recent first, This computer, New project…) and "Working in another window".
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { ConversationsController } = require('../src/conversations.ts');
const { ChatView } = require('../src/ChatView.tsx');
const { projectsByUse, projectGroups } = require('../src/ChatComposerControls.tsx');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
const OTHER = 'run-other-window-0001';

test('projects are listed by their newest chat; never-used ones follow by name', () => {
  const projects = ['Short videos', 'Brand assets', 'Dpro website', 'Flowxtra app', 'Archive'].map((name, i) => ({ id: `p${i}`, name }));
  const conversations = [
    { projectId: 'p0', updatedAt: '2026-10-20T10:00:00Z' }, { projectId: 'p2', updatedAt: '2026-10-28T09:00:00Z' },
    { projectId: 'p3', updatedAt: '2026-10-25T09:00:00Z' }, { projectId: 'p0', updatedAt: '2026-10-21T10:00:00Z' }, { projectId: null, updatedAt: '2026-10-29T00:00:00Z' },
  ];
  const ordered = projectsByUse(projects, conversations);
  assert.deepEqual(ordered.map(p => p.name), ['Dpro website', 'Flowxtra app', 'Short videos', 'Archive', 'Brand assets']);
  assert.deepEqual(projects.map(p => p.id), ['p0', 'p1', 'p2', 'p3', 'p4'], 'the list itself is not reordered');
  const folded = projectGroups(ordered, false);
  assert.deepEqual(folded.recent.map(p => p.name), ['Dpro website', 'Flowxtra app', 'Short videos']);
  assert.deepEqual(folded.local.map(p => p.name), ['Archive']);
  assert.equal(folded.hidden, 1);
  const open = projectGroups(ordered, true);
  assert.deepEqual(open.local.map(p => p.name), ['Archive', 'Brand assets']);
  assert.equal(open.hidden, 0);
  assert.deepEqual(projectGroups(ordered.slice(0, 2), false), { recent: ordered.slice(0, 2), local: [], hidden: 0 });
});

test('the picker follows the board: recent with ✓, No project, search, This computer, New project… ⇧⌘N', () => {
  const chip = src('ChatComposerControls.tsx');
  const body = chip.slice(chip.indexOf('export function ProjectChip'), chip.indexOf('/** New project / Folders and variables'));
  const order = ['groups.recent.map(row)', '<b>No project</b>', 'Search projects…', '>This computer<', '<b>A folder…</b>', 'groups.local.map(row)', '<b>More</b>', '<b>New project…</b>', '<kbd>⇧⌘N</kbd>'];
  let at = -1;
  for (const label of order) { const i = body.indexOf(label); assert.ok(i > at, `${label} in order`); at = i; }
  assert.match(body, /p\.id === s\.projectFilter && <span className="pop-check" aria-hidden="true">✓<\/span>/, 'the current project carries ✓');
  // A folder… reuses what exists: the desktop folder chooser, else the project sheet's folder picker; a known folder picks its project.
  assert.match(body, /chooseProjectFolders/);
  assert.match(body, /<ProjectFolderPicker controller=\{controller\}/);
  assert.match(body, /s\.projects\.find\(p => p\.folder === path\)/);
  assert.match(body, /onNewProject\(path\)/);
  assert.match(src('ChatView.tsx'), /onNewProject=\{folder => setProjectSheet\(\{ id: null, folder \}\)\}/);
  assert.match(src('ChatView.tsx'), /<ProjectSheet controller=\{controller\} id=\{projectSheet\.id\} folder=\{projectSheet\.folder\}/);
  assert.doesNotMatch(body, /localStorage|sessionStorage/);
  const css = src('styles.css');
  assert.ok(css.indexOf('/* Picker and other window (2026-10-28) */') < css.indexOf('.app-shell .pop-check'), 'new CSS sits at the end');
});

async function chat(t, hook) {
  const base = createLoginMock();
  const calls = [];
  const client = new SessionClient({ mock: async request => { calls.push(request); return (await hook?.(request, base)) ?? base(request); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const controller = new ConversationsController(client); t.after(() => controller.dispose());
  await controller.load();
  return { controller, client, calls };
}

test('a chat working in another window: the message waits in the queue and the chat says so', async t => {
  let release = () => {};
  t.after(() => release({ status: 404, body: { code: 'not_found' } }));
  const { controller, client, calls } = await chat(t, async request => {
    if (request.method === 'POST' && /\/runs$/.test(request.path)) return { status: 409, body: { code: 'conversation_busy', runId: OTHER } };
    if (request.path.includes(`/runs/${OTHER}/events`)) return new Promise(r => { release = r; }); // the other window is still answering
    return undefined;
  });
  await controller.send('Add the pricing table');
  const s = controller.getSnapshot();
  assert.equal(s.elsewhere, true);
  assert.equal(s.runId, OTHER);
  assert.deepEqual(s.queue.map(q => q.text), ['Add the pricing table']);
  assert.equal(s.queuePaused, false);
  assert.ok(calls.some(c => c.method === 'PUT' && /\/api\/chat\/conversations\//.test(c.path) && Array.isArray(c.body?.queued)), 'the waiting message is saved with the chat');
  const html = renderToStaticMarkup(React.createElement(ChatView, { controller, mode: 'mock', client }));
  assert.match(html, /This chat is working in another window\. Your message waits until it is done\./);
  assert.doesNotMatch(html, />Send now</, 'Send now only once the other reply has stopped (the queue is paused)');
  controller.newChat();
  assert.equal(controller.getSnapshot().elsewhere, false, 'a new chat forgets it');
});

test('a reply this window started is not "another window"; the notice text is in the chat view', async t => {
  const { controller } = await chat(t);
  await controller.send('Hello there');
  assert.equal(controller.getSnapshot().elsewhere, false);
  const view = src('ChatView.tsx');
  assert.match(view, /s\.elsewhere && s\.queue\.length > 0 && !s\.queuePaused && <p className="chat-notice" role="status">This chat is working in another window\. Your message waits until it is done\.<\/p>/);
  const ctl = src('conversations.ts');
  assert.match(ctl, /runId: r\.body\.runId, elsewhere: true/, 'the busy answer marks the other window');
  assert.match(ctl, /elsewhere: !!active/, 'opening a chat that is already answering follows it as another window');
  assert.match(ctl, /this\.publish\(\{ runId: null, stopping: false, reconnecting: false, elsewhere: false, queuePaused: stopped/, 'the end of the reply clears it');
});
