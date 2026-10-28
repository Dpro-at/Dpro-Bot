// CH3 composer: hold ⌥Space to dictate, and "/note" edits "Where we left off".
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { MicController } = require('../src/mic.ts');
const { ChatRecallController } = require('../src/chat-recall.ts');
const { HandoffCard } = require('../src/ChatRecall.tsx');
const { slashMatches, COMPOSER_KEYS } = require('../src/ChatComposerControls.tsx');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');

const owner = (calls = []) => ({
  getSnapshot: () => ({ user: { role: 'owner' } }),
  request: async (r) => { calls.push(r); return r.method === 'GET' ? { status: 200, body: { available: true, missing: [] } } : { status: 200, body: { text: 'hello there', ms: 5 } }; },
});
const clip = () => new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1])], { type: 'audio/webm' });

test('hold then let go: records, then the words land in the box', async (t) => {
  const calls = []; const texts = []; let stops = 0;
  const mic = new MicController(owner(calls), (x) => texts.push(x), { async open() { return { async stop() { stops++; return clip(); } }; } });
  t.after(() => mic.dispose());
  await mic.check();
  mic.hold(); await new Promise((r) => setImmediate(r));
  assert.equal(mic.getSnapshot().phase, 'recording');
  mic.hold(); // key repeat while held does nothing
  mic.release(); await new Promise((r) => setTimeout(r, 20));
  assert.equal(stops, 1);
  assert.deepEqual(texts, ['hello there']);
  assert.equal(calls.filter((r) => r.method === 'POST').length, 1);
  assert.equal(mic.getSnapshot().phase, 'idle');
  mic.hold(); await new Promise((r) => setImmediate(r));
  assert.equal(mic.getSnapshot().phase, 'recording', 'a second hold works again');
  await mic.cancel();
});

test('a short tap (let go before the microphone opened) records and sends nothing', async (t) => {
  const calls = []; const texts = []; let stops = 0; let open;
  const mic = new MicController(owner(calls), (x) => texts.push(x), { open: () => new Promise((r) => { open = () => r({ async stop() { stops++; return clip(); } }); }) });
  t.after(() => mic.dispose());
  await mic.check();
  mic.hold(); mic.release(); open(); await new Promise((r) => setTimeout(r, 20));
  assert.equal(stops, 1, 'the microphone is closed again');
  assert.equal(mic.getSnapshot().phase, 'idle');
  assert.deepEqual(texts, []);
  assert.equal(calls.filter((r) => r.method === 'POST').length, 0);
});

test('letting go does not stop a recording started with the mic button', async (t) => {
  const mic = new MicController(owner(), () => {}, { async open() { return { async stop() { return clip(); } }; } });
  t.after(() => mic.dispose());
  await mic.check(); await mic.start();
  mic.hold(); mic.release();
  assert.equal(mic.getSnapshot().phase, 'recording');
  await mic.cancel();
});

test('the chat listens for ⌥Space while active, keeps the box free of the space, and shows the two status labels', () => {
  const view = src('ChatView.tsx');
  assert.match(view, /e\.code !== 'Space' \|\| !e\.altKey/);
  assert.match(view, /e\.preventDefault\(\); if \(!e\.repeat\) mic\.hold\(\);/);
  assert.match(view, /if \(e\.code === 'Space' \|\| e\.key === 'Alt'\) mic\.release\(\);/);
  assert.match(view, /if \(!active \|\| !mic\) return;/);
  assert.match(view, /Listening…<\/span>\{clock\}/);
  assert.match(view, /m\.phase === 'transcribing' && <span className="mic-clock" aria-live="polite"><span className="mic-status">Writing it down…/);
  assert.match(view, /onClick=\{\(\) => void \(m\.phase === 'recording' \? mic\.stop\(\) : mic\.start\(\)\)\}/, 'the mic button still records on click');
  assert.ok(COMPOSER_KEYS.some(([t, k]) => t === 'Dictate (hold)' && k === '⌥Space'));
  assert.doesNotMatch(src('mic.ts'), /localStorage|sessionStorage|indexedDB/);
});

test('/note opens "Where we left off" for editing, read first so an existing note is kept', async () => {
  assert.deepEqual(slashMatches('/n').map((x) => [x.c, x.d]), [['/note', 'Edit "Where we left off"']]);
  const CONV = 'conv12345678';
  const handoff = { id: 'h-1', agentId: '_main', kind: 'conversation', scopeId: CONV, projectId: null, version: 2, source: 'agent', createdAt: '2026-10-20T18:40:00.000Z', done: ['Drafted posts'], left: [], next: ['Publish'], questions: [] };
  const calls = [];
  const c = new ChatRecallController({ request: async (r) => { calls.push(r); return r.path.startsWith('/api/handoffs?') ? { status: 200, body: { handoffs: [handoff] } } : { status: 404, body: null }; } });
  await c.editHandoff();
  assert.equal(c.getSnapshot().draft, null, 'no open chat: nothing happens');
  c.setConversation(CONV);
  await c.editHandoff();
  assert.deepEqual(c.getSnapshot().draft, { done: 'Drafted posts', left: '', next: 'Publish', questions: '' });
  assert.equal(calls.length, 1);
  const html = renderToStaticMarkup(React.createElement(HandoffCard, { c, agentId: '_main', agentName: 'Main Agent' }));
  assert.ok(html.includes('Save note') && html.includes('Drafted posts'));
  c.editDraft({ next: 'Publish\nAsk Sara' }); await c.editHandoff();
  assert.equal(c.getSnapshot().draft.next, 'Publish\nAsk Sara', 'an open edit is not reset');
  c.dispose();
  const view = src('ChatView.tsx');
  assert.match(view, /c === '\/note' && recallCtl && s\.activeId && \(convAgentId \|\| s\.agentId \|\| s\.agents\[0\]\?\.id\)\) \{ setPane\('details'\); setFocusPart\(f => \(\{ id: 'memory', n: \(f\?\.n \?\? 0\) \+ 1 \}\)\); setPick\(0\); void recallCtl\.editHandoff\(\); return; \}/);
});
