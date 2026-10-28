// CHAT-BUILD-01 follow-up (CH5, CH8): open in a new window, continue in another folder, the ⋯ menu, the composer order.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chatFromLink, continueSummary } = require('../src/chat-actions.tsx');
const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');

test('a chat window link names one chat id and nothing else', () => {
  assert.equal(chatFromLink('#chat=3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b'), '3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b');
  for (const bad of ['', '#chat=', '#chat=../x', '#chat=abc', '#chat=3f0c2b6e-1d2a&x=1', '#setup=abc', '#chat=javascript:alert(1)']) assert.equal(chatFromLink(bad), null, bad);
});

test('continue elsewhere drafts the first ask, the latest asks and where the last reply left it', () => {
  const t = (role, content, status = 'complete') => ({ key: content, role, content, parts: [], status, runId: null, durationMs: null, lastSeq: 0 });
  const turns = [t('user', 'Build the login page'), t('assistant', 'Done the form'), t('user', 'Add tests'), t('user', 'Also dark mode'), t('assistant', 'Tests pass. Dark mode is next.'), t('assistant', 'half', 'running')];
  const s = continueSummary('Login', turns);
  assert.match(s, /^Continue from the chat “Login” here/);
  assert.match(s, /- Build the login page\n- Add tests\n- Also dark mode/);
  assert.match(s, /Where it was left: Tests pass\. Dark mode is next\./);
  assert.doesNotMatch(s, /half/);
  assert.ok(continueSummary('x', [t('user', 'y'.repeat(9000))]).length <= 4000);
});

test('the chat row menu and the ⋯ menu hold the chat actions; export and board are icons', () => {
  const list = src('ConversationList.tsx');
  assert.match(list, /'Open in a new window', icon: 'open', shortcut: '⌘O'/);
  assert.match(list, /'Continue in another folder…'/);
  const view = src('ChatView.tsx');
  for (const label of ['Rename', 'Open in a new window', 'Continue in another folder…', 'Export…', 'Remember the whole chat', 'Delete…']) assert.ok(view.includes(`label: '${label}'`), label);
  assert.match(view, /aria-label="More for this chat"/);
  assert.match(view, /aria-label="Add to board" title="Add to board \(⌘B\)">\s*<UiIcon name="board" size=\{15\}\/><\/button>/);
  assert.match(view, /openKey=\{exportKey\} bare\/>/, 'Export opens from the ⋯ menu (no button of its own)');
  assert.doesNotMatch(view, /<span>Add to board<\/span>|<span>Export<\/span>/);
});

test('the new-chat composer starts with the project chip, then + and Mode', () => {
  const view = src('ChatView.tsx');
  const chip = view.indexOf('<ProjectChip'), plus = view.indexOf('<PlusButton'), mode = view.indexOf('<ModeButton');
  assert.ok(chip > 0 && chip < plus && plus < mode);
});

test('the desktop opens a chat window only for the app origin and a plain chat id', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', '..', 'desktop', 'src', 'main.cjs'), 'utf8');
  const block = main.slice(main.indexOf("ipcMain.handle('dpro:open-chat-window'"));
  assert.match(block, /origin !== appOrigin/);
  assert.match(block, /\/\^\[A-Za-z0-9\]\[A-Za-z0-9_-\]\{7,63\}\$\/\.test\(id\)/);
  assert.match(block, /chatWindows\.size >= 8/);
  assert.match(main, /function createAppWindow\(\)[\s\S]*setWindowOpenHandler[\s\S]*will-navigate/);
});

test('a reply in a folder where git could start a program says Undo is not available', () => {
  const React = require('../node_modules/react');
  const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
  const { conversationResponse: res } = require('../src/conversation-contract.js');
  const { fromWire } = require('../src/turns.ts');
  const { ChangesLine, MomentsContext } = require('../src/ChatMoments.tsx');
  const CID = '3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b';
  const msg = (changes) => res(`/api/chat/conversations/${CID}/messages`, 200, { conversation: { id: CID, title: 't', agentId: null, projectId: null, pinned: false, preview: '', createdAt: '', updatedAt: '' }, activeRunId: null,
    messages: [{ id: 'm-1', role: 'assistant', content: 'ok', status: 'complete', runId: null, durationMs: 1, createdAt: '', parts: null, changes }] });
  const wire = msg({ files: 0, undone: false, unavailable: true }).messages[0];
  assert.deepEqual(wire.changes, { files: 0, undone: false, unavailable: true });
  assert.equal(msg({ files: 0, undone: false }).messages[0].changes, undefined);
  const html = renderToStaticMarkup(React.createElement(MomentsContext.Provider, { value: { client: { request: async () => ({}) }, conversationId: CID } }, React.createElement(ChangesLine, { turn: fromWire(wire), messageId: 'm-1' })));
  assert.match(html, /Undo not available for this folder/);
  assert.doesNotMatch(html, /Undo these changes/);
});
