// CH2 item 4 / CH10 item 10: a finished reply's work groups repeated kinds ("Ran 6 commands") folded and opened.
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
const { workGroups, workSegments, workSummary, groupLabel } = require('../src/turns.ts');
const { WorkedRow } = require('../src/ChatView.tsx');

const cmd = (id, command, ms, extra = {}) => ({ id, name: 'exec', input: JSON.stringify({ command }), output: `out ${id}`, ms, running: false, ...extra });
const read = (id, path) => ({ id, name: 'read_file', input: JSON.stringify({ path }), output: 'x', ms: 100, running: false });
const parts = [
  { kind: 'reasoning', text: 'Plan it', startedAt: 0, endedAt: 7000 },
  { kind: 'tools', step: 1, calls: [cmd('c1', 'npm ci', 4000), cmd('c2', 'npm run build', 2500)] },
  { kind: 'reasoning', text: 'Now the tests', startedAt: 9000, endedAt: 14000 },
  { kind: 'tools', step: 2, calls: [cmd('c3', 'npm test -- hero', 8000, { isError: true, output: '✗ hero image has alt text' }), cmd('c4', 'git status', 200)] },
  { kind: 'tools', step: 3, calls: [read('r1', 'src/a.ts'), read('r2', 'src/b.ts'), cmd('c5', 'ls', 120)] },
  { kind: 'text', text: '' },
  { kind: 'tools', step: 4, calls: [{ id: 'm1', name: 'memory_save', input: '{"text":"hero stacks under 640 px"}', output: 'ok', running: false }] },
];
/** Visible words of a node, one space between elements (sr-only text left out). */
const text = n => { const out = []; const walk = e => { for (const c of e.childNodes) { if (c.nodeType === 3) out.push(c.textContent); else if (!c.classList?.contains('sr-only')) walk(c); } }; walk(n); return out.map(s => s.trim()).filter(Boolean).join(' '); };

test('folded row: one part per kind in first-seen order, thinking first; the old one-line summary still works', () => {
  assert.deepEqual(workSegments(parts).map(s => s.label), ['Thought for 12s', 'Ran 5 commands', 'Read 2 files', 'Used memory 1 time']);
  assert.equal(workSegments(parts)[1].failed, 1);
  assert.deepEqual(workSegments([{ kind: 'reasoning', text: 'x' }]).map(s => s.label), ['Thought'], 'untimed thinking');
  assert.deepEqual(workSegments([{ kind: 'reasoning', text: '  ' }]), [], 'empty thinking is not counted');
  assert.equal(workSummary(parts), 'Ran 5 commands, read 2 files, used memory 1 time');
  assert.equal(groupLabel('command', 1), 'Ran 1 command');
  const html = renderToStaticMarkup(React.createElement(WorkedRow, { parts, ms: 72000 }));
  assert.match(html, /Worked for 1m 12s/);
  assert.match(html, /Thought for 12s<span class="worked-seg-caret" aria-hidden="true"> ›<\/span>/);
  assert.match(html, /data-error="true"><span aria-hidden="true">· <\/span>Ran 5 commands, 1 failed/);
  assert.doesNotMatch(html, /worked-body/, 'folded until opened');
});

test('opened: back-to-back steps of one kind are one group; thinking between them stays inside, in order; other kinds keep their place', () => {
  const g = workGroups(parts);
  assert.deepEqual(g.map(x => x.kind === 'group' ? `${x.tool}:${x.calls.length}` : x.part.kind), ['reasoning', 'command:4', 'read:2', 'command:1', 'memory:1']);
  assert.deepEqual(g[1].entries.map(e => e.id ?? e.kind), ['c1', 'c2', 'reasoning', 'c3', 'c4']);
  // Thinking after a group that a different kind follows stays outside it.
  const g2 = workGroups([{ kind: 'tools', step: 1, calls: [cmd('a', 'ls', 1)] }, { kind: 'reasoning', text: 'hm' }, { kind: 'tools', step: 2, calls: [read('b', 'x.ts')] }]);
  assert.deepEqual(g2.map(x => x.kind === 'group' ? x.tool : x.part.kind), ['command', 'reasoning', 'read']);
  // A note or steer between two commands ends the group.
  const g3 = workGroups([{ kind: 'tools', step: 1, calls: [cmd('a', 'ls', 1)] }, { kind: 'steer', text: 'also', step: 1 }, { kind: 'tools', step: 2, calls: [cmd('b', 'pwd', 1)] }]);
  assert.deepEqual(g3.map(x => x.kind === 'group' ? `${x.tool}:${x.calls.length}` : x.part.kind), ['command:1', 'steer', 'command:1']);
});

test('the opened list in the window: a group opens to each command in mono with its time; a failed one is marked and opens by itself', async t => {
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  t.after(async () => { await act(async () => root.unmount()); container.remove(); });
  await act(async () => { root.render(React.createElement(WorkedRow, { parts, ms: 72000 })); });
  const head = container.querySelector('.worked > .scaffold-row');
  assert.equal(head.getAttribute('aria-expanded'), 'false');
  await act(async () => { head.click(); });
  const body = container.querySelector('.worked-body');
  assert.ok(body);
  const groups = [...body.querySelectorAll('.tool-group')];
  assert.equal(groups.length, 2, 'commands (4) and reads (2) are groups; single steps stay plain rows');
  const [commands, reads] = groups;
  assert.match(text(commands.querySelector('.scaffold-row')), /^Ran 4 commands 1 failed 15s$/);
  assert.equal(commands.dataset.error, 'true');
  assert.equal(commands.querySelector('.scaffold-row').getAttribute('aria-expanded'), 'true', 'a group with a failed step opens by itself');
  const rows = [...commands.querySelectorAll('.tool-group-body > .tool-row')];
  assert.deepEqual(rows.map(r => r.querySelector('.tool-target code').textContent), ['npm ci', 'npm run build', 'npm test -- hero', 'git status']);
  assert.ok(rows.every(r => !r.querySelector('.tool-verb')), 'commands show only their text');
  assert.deepEqual(rows.map(r => [...r.querySelectorAll('.tool-meta')].at(-1).textContent), ['4s', '3s', '8s', '0.2s']);
  assert.equal(rows[2].dataset.error, 'true'); assert.match(text(rows[2]), /failed/);
  assert.ok(commands.querySelector('.tool-group-body > .thinking'), 'thinking between commands stays in place');
  // Each step still opens to its output.
  await act(async () => { rows[2].querySelector('.scaffold-row').click(); });
  assert.match(rows[2].querySelector('.tool-output pre').textContent, /hero image has alt text/);
  assert.match(text(rows[2].querySelector('.tool-output-head')), /^Error/);
  // The reads group is folded until opened; reads keep their verb.
  assert.equal(reads.querySelector('.tool-group-body'), null);
  await act(async () => { reads.querySelector('.scaffold-row').click(); });
  assert.deepEqual([...reads.querySelectorAll('.tool-row')].map(text), ['Read a.ts 0.1s', 'Read b.ts 0.1s']);
  // Order: thinking, commands, reads, the lone command, the remembered step.
  const order = [...body.children].map(n => n.classList.contains('tool-group') ? 'group' : n.classList.contains('thinking') ? 'thinking' : text(n));
  assert.deepEqual(order, ['thinking', 'group', 'group', 'Ran ls 0.1s', 'Saved to memory hero stacks under 640 px']);
});
