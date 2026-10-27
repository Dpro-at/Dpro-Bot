// CHAT-PRO-02 F: export a conversation as Markdown — the strict export path (browser
// and bridge), the projected answer, the Blob download in the page and the Export menu.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { ConversationsController } = require('../src/conversations.ts');
const { ChatView } = require('../src/ChatView.tsx');
const { exportConversation, exportNote, saveMarkdown } = require('../src/chat-export.ts');
const { allowedChatExport, chatExportPath, chatExportResponse, exportPath, safeFilename } = require('../src/chat-export-contract.js');
const { allowed } = require('../scripts/application-server.cjs');

const CID = 'conv-0000000001';
const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (!fn()) { if (Date.now() > end) throw Error('timeout'); await new Promise(r => setTimeout(r, 20)); } };

async function fixture(t) {
  const calls = []; const base = createLoginMock();
  const client = new SessionClient({ mock: async r => { calls.push({ method: r.method, path: r.path }); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  let n = 0;
  const c = new ConversationsController(client, () => `id${String(++n).padStart(10, '0')}`);
  t.after(() => c.dispose());
  return { c, client, calls };
}

test('contract (browser and bridge): one GET path, plain or with exactly ?tools=1', () => {
  const good = [chatExportPath(CID), chatExportPath(CID, true)];
  const bad = [
    `/api/chat/conversations/${CID}/export?tools=0`, `/api/chat/conversations/${CID}/export?tools=1&x=1`, `/api/chat/conversations/${CID}/export?x=1`,
    `/api/chat/conversations/${CID}/export/`, '/api/chat/conversations/../export', '/api/chat/conversations/short/export', `/api/chat/conversations/${CID}/exports`,
    `/api/chat/conversations/${CID}%2fx/export`, `/api/chat/conversations/${CID}/export#x`,
  ];
  for (const p of good) {
    assert.equal(allowedChatExport('GET', p, undefined), true, p);
    assert.equal(allowedRequest('GET', p, undefined), true, p);
    assert.equal(allowed('GET', p, undefined), true, `bridge ${p}`);
  }
  for (const p of bad) { assert.equal(allowedRequest('GET', p, undefined), false, p); assert.equal(allowed('GET', p, undefined), false, `bridge ${p}`); }
  for (const m of ['POST', 'PUT', 'DELETE']) { assert.equal(allowedRequest(m, good[0], {}), false); assert.equal(allowed(m, good[0], {}), false); }
  assert.equal(allowedRequest('GET', good[0], {}), false, 'no body');
  assert.deepEqual(exportPath(good[1]), { id: CID, tools: true });
  assert.equal(chatExportPath(CID), `/api/chat/conversations/${CID}/export`);
});

test('answers are projected to reviewed fields; malformed ones are refused', () => {
  const P = chatExportPath(CID);
  const body = { filename: '../etc/x.md', markdown: '# Hi\n', turns: 2, totalTurns: 3, truncated: true, redacted: 1, userId: 'u1', path: '/tmp/x' };
  const out = chatExportResponse(P, 200, body);
  assert.deepEqual(Object.keys(out).sort(), ['filename', 'markdown', 'redacted', 'totalTurns', 'truncated', 'turns']);
  assert.equal(out.filename, 'etc x.md', 'no path parts in the file name');
  for (const b of [{ ...body, markdown: '' }, { ...body, markdown: 5 }, { ...body, turns: 4 }, { ...body, redacted: -1 }, { ...body, markdown: 'x'.repeat(1_500_001) }, 'x'])
    assert.throws(() => chatExportResponse(P, 200, b));
  assert.deepEqual(chatExportResponse(P, 404, { error: 'Not found', code: 'not_found' }), { code: 'not_found' });
  assert.equal(chatExportResponse(P, 500, { error: 'boom' }), null);
  assert.throws(() => chatExportResponse('/api/chat/conversations/x/export', 200, body));
  assert.equal(safeFilename('a/b\\c:d*e?.md'), 'a b c d e.md');
  assert.equal(safeFilename('خطة النشر.md'), 'خطة النشر.md');
  assert.equal(safeFilename(''), 'conversation.md');
  assert.equal(safeFilename(null), 'conversation.md');
  assert.ok(safeFilename('x'.repeat(500)).length <= 90);
});

test('the page saves the Markdown through a Blob link and frees it', async () => {
  const made = []; const revoked = []; const clicked = [];
  const doc = { body: { appendChild: a => { a.parentNode = true; } }, createElement: () => ({ style: {}, click() { clicked.push({ href: this.href, download: this.download }); }, remove() { this.removed = true; } }) };
  const url = { createObjectURL: b => { made.push(b); return 'blob:x-1'; }, revokeObjectURL: h => revoked.push(h) };
  saveMarkdown('Notes.md', '# Notes\n', doc, url);
  assert.equal(made.length, 1); assert.equal(made[0].type, 'text/markdown;charset=utf-8');
  assert.equal(await made[0].text(), '# Notes\n');
  assert.deepEqual(clicked, [{ href: 'blob:x-1', download: 'Notes.md' }]);
  await new Promise(r => setTimeout(r, 5));
  assert.deepEqual(revoked, ['blob:x-1']);
  assert.equal(exportNote({ filename: 'a.md', markdown: 'x', turns: 2, totalTurns: 5, truncated: true, redacted: 2 }), 'Saved a.md · only the first 2 of 5 messages fit · 2 secret values were left out.');
  assert.equal(exportNote({ filename: 'a.md', markdown: 'x', turns: 1, totalTurns: 1, truncated: false, redacted: 0 }), 'Saved a.md.');
});

test('export of a mock conversation: writers, text and (only when asked) tool calls', async t => {
  const { c, client, calls } = await fixture(t);
  await c.load();
  c.edit('Plan the launch week'); await c.send();
  await until(() => !c.getSnapshot().runId);
  const id = c.getSnapshot().activeId;
  const saved = [];
  const plain = await exportConversation(client, id, false, (f, m) => saved.push({ f, m }));
  assert.equal(plain.ok, true);
  assert.equal(saved[0].f, 'Plan the launch week.md');
  assert.match(saved[0].m, /### You · /); assert.match(saved[0].m, /### Main agent · /);
  assert.ok(!saved[0].m.includes('Tool calls'));
  const withTools = await exportConversation(client, id, true, (f, m) => saved.push({ f, m }));
  assert.equal(withTools.ok, true);
  assert.match(saved[1].m, /<summary>Tool calls \(2\)<\/summary>/);
  assert.deepEqual(calls.filter(x => x.path.includes('/export')).map(x => x.path), [chatExportPath(id), chatExportPath(id, true)]);
  const missing = await exportConversation(client, 'conv-99999999', false, () => assert.fail('nothing saved'));
  assert.deepEqual(missing, { ok: false, message: 'This conversation no longer exists.' });
});

test('the chat top bar shows Export for an open conversation; a failed export shows a notice', async t => {
  const { c, client } = await fixture(t);
  assert.ok(!renderToStaticMarkup(React.createElement(ChatView, { controller: c, mode: 'mock', client })).includes('chat-export-button'), 'no Export on an empty chat');
  c.edit('Hello there'); await c.send(); await until(() => !c.getSnapshot().runId);
  const html = renderToStaticMarkup(React.createElement(ChatView, { controller: c, mode: 'mock', client }));
  assert.match(html, /chat-export-button/); assert.match(html, /aria-label="Export" title="Export as Markdown"/);
  const r = await c.exportMarkdown('conv-99999999');
  assert.equal(r.ok, false); assert.equal(c.getSnapshot().notice, 'This conversation no longer exists.');
});

test('a guest cannot export', async () => {
  const auth = createLoginMock(); const calls = [];
  const client = new SessionClient({ mock: async r => { calls.push(r.path); const out = await auth(r); if (out.body?.user) out.body.user = { ...out.body.user, role: 'guest' }; return out; } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  await assert.rejects(client.request({ method: 'GET', path: chatExportPath(CID) }));
  assert.equal(calls.filter(p => p.includes('/export')).length, 0);
});
