// CH4/CH8 (2026-10-28): the Changes pane shows a diff in one column or side by side; the choice is kept per person on the server.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { PanesController, diffLines, splitRows, SPLIT_MIN_WIDTH } = require('../src/panes.ts');
const { ChangesPane } = require('../src/ProjectPanes.tsx');
const { allowedConversation: allow, conversationResponse: res } = require('../src/conversation-contract.js');

const PID = '00000000-0000-4000-8000-000000000001';
const DIFF = '@@ -1,4 +1,4 @@\n a\n-b\n-c\n+B\n d\n@@ -9 +9,2 @@\n x\n+y\n';
function fake(saved = 'split') {
  const calls = [];
  const client = { request: async r => { calls.push(r);
    if (r.path === '/api/chat/panel') return r.method === 'GET' ? { status: 200, body: { panel: { order: [], folded: [], diff: saved } } } : { status: 200, body: { panel: { diff: r.body.diff } } };
    if (r.path.endsWith('/changes')) return { status: 200, body: { branch: 'main', truncated: false, changes: [{ path: 'src/a.ts', status: 'modified', added: 2, removed: 2 }] } };
    if (r.path.includes('/diff')) return { status: 200, body: { path: 'src/a.ts', diff: DIFF, hidden: false, binary: false, truncated: false } };
    return { status: 404, body: {} }; } };
  return { client, calls };
}

test('side by side rows: context on both sides, removed paired with added, the short side padded', () => {
  const rows = splitRows(diffLines(DIFF));
  const view = rows.map(r => r.kind !== 'pair' ? r.kind : [r.left && `${r.left.kind}${r.left.no}`, r.right && `${r.right.kind}${r.right.no}`]);
  assert.deepEqual(view, ['hunk', ['ctx1', 'ctx1'], ['del2', 'add2'], ['del3', null], ['ctx4', 'ctx3'], 'hunk', ['ctx9', 'ctx9'], [null, 'add10']]);
  assert.deepEqual(splitRows(diffLines('@@ -1 +1 @@\n+n\n-o\n')).filter(r => r.kind === 'pair').map(r => [r.left?.kind ?? null, r.right?.kind ?? null]), [[null, 'add'], ['del', null]], 'an added run before a removed one is not paired backwards');
  assert.equal(SPLIT_MIN_WIDTH, 520);
});

test('the choice is read from and saved to the server only; the pane shows it and keeps it across projects', async t => {
  const { client, calls } = fake('split');
  const panes = new PanesController(client); t.after(() => panes.dispose());
  assert.equal(panes.getSnapshot().diffView, 'unified', 'one column until the server answers');
  await panes.loadDiffView(); await panes.loadDiffView();
  assert.equal(calls.filter(c => c.method === 'GET' && c.path === '/api/chat/panel').length, 1, 'read once');
  assert.equal(panes.getSnapshot().diffView, 'split');
  panes.setProject(PID); await panes.loadChanges(); await panes.toggleDiff('src/a.ts');
  let html = renderToStaticMarkup(React.createElement(ChangesPane, { panes }));
  assert.match(html, /role="radiogroup" aria-label="Diff view"/);
  assert.match(html, /aria-checked="true"[^>]*>Side by side/);
  assert.match(html, /data-diff="split"/); assert.match(html, /diff-split/); assert.match(html, /side by side/);
  assert.match(html, /class="diff-side" data-kind="del"[^]*?class="diff-side" data-kind="add"/, 'old on the left, new on the right');
  assert.match(html, /data-kind="empty"/);
  panes.setDiffView('unified');
  const put = calls.filter(c => c.method === 'PUT');
  assert.deepEqual(put.map(c => c.body), [{ diff: 'unified' }], 'only the diff field is sent, so the panel order and folds stay');
  html = renderToStaticMarkup(React.createElement(ChangesPane, { panes }));
  assert.match(html, /data-diff="unified"/); assert.doesNotMatch(html, /diff-split/); assert.match(html, /class="diff-line" data-kind="del"/);
  panes.setDiffView('unified'); assert.equal(calls.filter(c => c.method === 'PUT').length, 1, 'no save when nothing changes');
  panes.setProject(null); assert.equal(panes.getSnapshot().diffView, 'unified');
  panes.setDiffView('split'); panes.setProject(PID); assert.equal(panes.getSnapshot().diffView, 'split', 'the choice survives a project switch');
  const src = fs.readFileSync(path.join(__dirname, '../src/panes.ts'), 'utf8') + fs.readFileSync(path.join(__dirname, '../src/ProjectPanes.tsx'), 'utf8');
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB/, 'never browser storage');
});

test('a narrow pane falls back to one column and keeps the choice', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/ProjectPanes.tsx'), 'utf8');
  assert.match(src, /width < SPLIT_MIN_WIDTH/);
  assert.match(src, /s\.diffView === 'split' && !narrow \? 'split' : 'unified'/);
  const css = fs.readFileSync(path.join(__dirname, '../src/styles.css'), 'utf8');
  const tail = css.slice(css.lastIndexOf('/* Diff views (2026-10-28) */'));
  assert.ok(tail.length > 30, 'the section is at the end of the stylesheet');
  assert.match(tail, /\.chat-pane \.diff-side\[data-kind=add\][^{]*\{ color:#9DB5AA;/);
  assert.match(tail, /\.chat-pane \.diff-side\[data-kind=del\][^{]*\{ color:#F29BA0;/);
});

test('contract: the panel carries the diff view; only unified or split is sent', () => {
  assert.equal(allow('PUT', '/api/chat/panel', { diff: 'split' }), true);
  assert.equal(allow('PUT', '/api/chat/panel', { order: ['team'], diff: 'unified' }), true);
  for (const diff of ['wide', 1, null]) assert.equal(allow('PUT', '/api/chat/panel', { diff }), false, String(diff));
  assert.equal(res('/api/chat/panel', 200, { panel: { order: ['team'], folded: [], diff: 'split' } }).panel.diff, 'split');
  assert.equal(res('/api/chat/panel', 200, { panel: { diff: 'wide' } }).panel.diff, 'unified');
  assert.equal(res('/api/chat/panel', 200, {}).panel.diff, 'unified');
});
