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
