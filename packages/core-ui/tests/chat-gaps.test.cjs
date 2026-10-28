// CHAT-GAPS-01: small text is readable, sign-in opens the last chat, first run without a model, the folder stays fixed.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { conversationResponse } = require('../src/conversation-contract.js');
const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
const lum = (c) => { const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const mix = (fg, bg, p) => fg.map((v, i) => v * p + bg[i] * (1 - p));

test('small text keeps 4.5:1 on the canvas and the sidebar, in light and dark', () => {
  const css = src('styles.css');
  const pct = (block, name) => Number(new RegExp(`--${name}:color-mix\\(in srgb,var\\(--text\\) (\\d+)%`).exec(block)[1]) / 100;
  const light = css.slice(css.indexOf('.app-shell { grid-template-columns'), css.indexOf('--ease-arrive'));
  const dark = css.slice(css.indexOf('.shell[data-theme="dark"] .app-shell, .app-shell[data-theme="dark"] { --text-2'));
  for (const [block, text, bgs, needs] of [[light, '#252528', ['#F8F9FE', '#F3F7FF', '#FDFDFD'], '#A15C00'], [dark, '#D9E0E6', ['#0D1015', '#010409', '#0E0F12'], '#E0A040']]) {
    for (const bg of bgs) {
      for (const name of ['text-2', 'text-3', 'text-4']) assert.ok(ratio(mix(hex(text), hex(bg), pct(block, name)), hex(bg)) >= 4.5, `${name} on ${bg}`);
      assert.ok(ratio(hex(needs), hex(bg)) >= 4.5, `needs amber on ${bg}`);
    }
    assert.match(block, new RegExp(`--needs:${needs}`));
  }
  assert.doesNotMatch(css, /\{ color:#E0A040/, 'amber text uses the readable token');
});

test('sign-in opens the chat that was open (kept on the server, not in the browser); a new chat forgets it', () => {
  const { allowedConversation: allow, conversationResponse: res } = require('../src/conversation-contract.js');
  const ID = '9a8b7c6d-1d2a-4f4e-9b1a-6c7d8e9f0a1b';
  assert.equal(allow('GET', '/api/chat/last', undefined), true);
  for (const body of [{ last: ID }, { last: null }]) assert.equal(allow('PUT', '/api/chat/last', body), true);
  for (const body of [{}, { last: '../x' }, { last: ID, other: 1 }, { last: 5 }]) assert.equal(allow('PUT', '/api/chat/last', body), false, JSON.stringify(body));
  assert.deepEqual(res('/api/chat/last', 200, { last: ID }), { last: ID });
  assert.deepEqual(res('/api/chat/last', 200, { last: '<script>' }), { last: null });
  const ctl = src('conversations.ts');
  assert.match(ctl, /this\.rememberLast\(id\);/, 'opening a chat remembers it');
  assert.match(ctl, /this\.rememberLast\(null\);/, 'a new chat forgets it');
  assert.match(ctl, /!this\.#state\.activeId && this\.#state\.conversations\.some\(c => c\.id === id\)/, 'only a chat that still exists, and only when nothing else was opened');
  assert.match(src('SignedInShell.tsx'), /if \(!linked\) \{ void c\.restoreLast\(\); return; \}/);
});

test('first run without a model: one card that leads to Models and replies', () => {
  const view = src('ChatView.tsx');
  assert.match(view, /s\.modelsLoaded && s\.models\.length === 0 && onSetUpModel/);
  assert.match(view, /Your team needs a model to think with/);
  assert.match(src('SignedInShell.tsx'), /onSetUpModel=\{\(\) => openSettings\('replies'\)\}/);
  assert.match(src('conversations.ts'), /this\.publish\(\{ modelsLoaded: true,/);
});

test('a chat that already worked in its folder stays there: the refusal passes and says what to do', () => {
  const r = conversationResponse('/api/chat/conversations/9a8b7c6d-1d2a-4f4e-9b1a-6c7d8e9f0a1b', 409, { code: 'folder_fixed', error: 'x' });
  assert.equal(r.code, 'folder_fixed');
  assert.match(src('conversations.ts'), /r\.status === 409\) this\.publish\(\{ notice: 'This chat already worked in its folder\. Continue in another folder… starts a new chat there\.' \}\)/);
});

test('the footer never swaps names and icons forever at the edge width (that left a blank window)', () => {
  const footer = src('ShellFooter.tsx');
  assert.match(footer, /wentAt\.current=el\.clientWidth;setCompact\(true\)/, 'remember the width when names stopped fitting');
  assert.match(footer, /el\.clientWidth>=needed\.current&&el\.clientWidth>wentAt\.current\+24\)setCompact\(false\)/, 'names come back only after the footer really got wider');
});

test('approval card: the request is read at once (Allow once with no extra step) and ⋯ opens Approvals', () => {
  const m = src('ChatMoments.tsx');
  assert.match(m, /useEffect\(\(\) => \{ if \(client && id && state === 'waiting' && !detail\) void review\(\); \}, \[id\]\)/);
  assert.match(m, /label: 'Open in Approvals', icon: 'open', run: onOpenApprovals/);
  assert.match(m, /'Always allow this… \(Approval rules\)'/);
  assert.ok(m.indexOf('useEffect(() => { if (client && id') < m.indexOf("if (!client || !id) return null;"), 'hooks before the early return');
  assert.match(src('SignedInShell.tsx'), /onOpenApprovals=\{\(\) => setPage\('approvals'\)\}/);
});

test('chat keys: ⌘P pin, ⇧⌘S export, ⌘⌫ archive (not while typing), ⌥⌘⌫ delete asks, ⇧⌘C copies the last reply, ⌘\\ sidebar', () => {
  const v = src('ChatView.tsx');
  assert.match(v, /k === 'p' && !e\.shiftKey && !e\.altKey\) hit\(\(\) => void controller\.pin\(id, !conv\.pinned\)\)/);
  assert.match(v, /k === 's' && e\.shiftKey && !e\.altKey\) hit\(\(\) => setExportKey\(Date\.now\(\)\)\)/);
  assert.match(v, /k === 'backspace' && !typing\) hit\(\(\) => \(e\.altKey \? setChatSheet\('delete'\) : void controller\.archive\(id, !conv\.archived\)\)\)/);
  assert.match(v, /k === 'c' && e\.shiftKey && !e\.altKey\)/);
  assert.match(src('SignedInShell.tsx'), /e\.key === '\\\\'\) \{ e\.preventDefault\(\); setRail\(v => !v\); \}/);
  const list = src('ConversationList.tsx');
  for (const k of ["shortcut: '⌘P'", "shortcut: '⇧⌘S'", "shortcut: '⌘⌫'", "shortcut: '⌥⌘⌫'", "shortcut: '⌘B'"]) assert.ok(list.includes(k), k);
});

test('sidebar menus: a chat can go to the board; a project has Rename, Fold all and Delete; chats drag onto projects', () => {
  const list = src('ConversationList.tsx');
  assert.match(list, /label: 'Add to board…', icon: 'board' as const, shortcut: '⌘B', run: \(\) => onAddToBoard\(c\.id\)/);
  for (const label of ["'Rename…'", "'Fold all'", "'Delete project…'", "'Folders and variables…'", "'New chat here'"]) assert.ok(list.includes(`label: ${label}`), label);
  assert.match(list, /onDragStart=\{e => \{ e\.dataTransfer\.setData\(CHAT_DRAG, c\.id\)/);
  assert.match(list, /onDrop=\{e => \{ const id = e\.dataTransfer\.getData\(CHAT_DRAG\); setDropOn\(null\); if \(id\) \{ e\.preventDefault\(\); void controller\.moveToProject\(id, p\.id\); \} \}\}/);
  assert.match(src('ChatView.tsx'), /useEffect\(\(\) => \{ if \(boardRequest > 0 && canBoard\) openCardForm\(\); \}, \[boardRequest\]\)/);
});

test('Settings › General turns the done-in-the-background notice on or off; the plan-limit card can keep the model', () => {
  const { allowedConversation: allow, conversationResponse: res } = require('../src/conversation-contract.js');
  assert.equal(allow('GET', '/api/chat/settings', undefined), true);
  assert.equal(allow('PUT', '/api/chat/settings', { notifyDone: false }), true);
  for (const b of [{}, { notifyDone: 'no' }, { notifyDone: true, x: 1 }]) assert.equal(allow('PUT', '/api/chat/settings', b), false);
  assert.deepEqual(res('/api/chat/settings', 200, { settings: { notifyDone: false } }), { settings: { notifyDone: false } });
  assert.deepEqual(res('/api/chat/settings', 200, {}), { settings: { notifyDone: true } }, 'on unless turned off');
  assert.match(src('conversations.ts'), /if \(this\.#notifyDone && last\?\.role === 'assistant' && \(last\.durationMs \?\? 0\) >= 60_000\) notifyDone\(/);
  assert.match(src('AppSettings.tsx'), /\{live&&<ChatNoticeSettings client=\{client!\}\/>\}/);
  assert.match(src('ChatMoments.tsx'), />Keep this model</);
});

test('terminal: Stop sends ⌃C, ⌃⇧` opens a new tab, your own shell says "· you"', () => {
  const t = src('TerminalPane.tsx');
  assert.match(t, /aria-label="Stop" title="Stop what runs here \(⌃C\)" disabled=\{!active\} onClick=\{\(\) => active\?\.terminal\.write\('\\x03'\)\}/);
  assert.match(t, /'New terminal \(⌃⇧`\)'/);
  assert.match(t, / · you\{folder/);
  const v = src('ChatView.tsx');
  assert.ok(v.indexOf("e.ctrlKey && e.shiftKey && !e.metaKey && e.code === 'Backquote'") < v.indexOf("e.ctrlKey && !e.metaKey && e.code === 'Backquote'"), 'the new-tab key is checked before the toggle');
});

test('Place: an added folder can be removed (the files stay) and a started chat can continue in another folder', () => {
  const d = src('ChatDetails.tsx');
  assert.match(d, /folders: \(project\.folders \?\? \[\]\)\.filter\(x => x\.path !== f\.path\)/);
  assert.match(d, /s\.turns\.length > 0 && <button type="button" className="link-button panel-add" onClick=\{onContinue\}>/);
  assert.match(src('ChatView.tsx'), /onContinue=\{\(\) => setChatSheet\('continue'\)\}/);
});

test('reply actions: Answer again on the last finished reply; Copy shows its key; a working hand-off can be stopped', () => {
  const v = src('ChatView.tsx');
  assert.match(v, /onAgain=\{last && turn\.status === 'complete' \? onRetry : undefined\}/);
  assert.match(v, /aria-label="Answer again"/);
  assert.match(v, /label="Copy reply \(⇧⌘C\)"/);
  assert.match(v, /onStop: \(\) => void controller\.stopAll\(\)/);
  assert.match(src('ChatMoments.tsx'), /\{call\.running && onStop && <div className="moment-actions"><button type="button" className="link-button" onClick=\{onStop\}>/);
});

test('changed files row shows +N −N; the summary notice can be read and started from', () => {
  const { conversationResponse: res } = require('../src/conversation-contract.js');
  const m = src('ChatMoments.tsx');
  assert.match(m, /<span className="diff-add">\+\{turn\.changes\.added\}<\/span> <span className="diff-del">−\{turn\.changes\.removed\}<\/span>/);
  assert.match(m, /\{shown \? 'Hide the summary' : 'Read the summary'\}/);
  assert.match(m, /m\.onStartFresh!\(summary \|\| head\)/);
  const long = `3 older messages were summed up.\n\n${'s'.repeat(2000)}`;
  const out = res('/api/chat/conversations/9a8b7c6d-1d2a-4f4e-9b1a-6c7d8e9f0a1b/messages', 200, { messages: [{ id: 'm1', role: 'assistant', content: 'x', parts: [{ kind: 'notice', code: 'summarized', text: long }, { kind: 'notice', code: 'injection', text: 'i'.repeat(900) }], status: 'complete', runId: null, durationMs: null, createdAt: '', changes: { files: 2, undone: false, added: 7, removed: 3 } }], activeRunId: null, conversation: { id: '9a8b7c6d-1d2a-4f4e-9b1a-6c7d8e9f0a1b', title: 't', agentId: null, projectId: null, pinned: false, preview: '', createdAt: '', updatedAt: '' } });
  const msg = out.messages[0];
  assert.equal(msg.parts.find((p) => p.code === 'summarized').text.length, long.length, 'the summary is kept whole (up to 2400)');
  assert.equal(msg.parts.find((p) => p.code === 'injection').text.length, 300, 'other notices stay one line');
  assert.deepEqual(msg.changes, { files: 2, undone: false, added: 7, removed: 3 });
});
