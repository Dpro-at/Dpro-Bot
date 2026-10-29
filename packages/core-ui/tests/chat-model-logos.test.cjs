// CH12: which apps and models worked in a chat — the app mark on each Team row, the Models line with counts, the hover card.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { modelApp, modelsUsed, AppMark } = require('../src/ChatDetails.tsx');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'ChatDetails.tsx'), 'utf8');

test('each model id maps to its app; Auto and none have no app; a model on this computer is local', () => {
  assert.deepEqual(modelApp('subscription:claude'), { id: 'subscription:claude', name: 'Claude Code' });
  assert.equal(modelApp('subscription:claude/sonnet').name, 'Claude Code');
  assert.equal(modelApp('subscription:claude:3f2a').name, 'Claude Code', 'a previous session stays the same app');
  assert.equal(modelApp('subscription:codex/gpt-6').name, 'Codex');
  assert.equal(modelApp('subscription:gemini').name, 'Gemini');
  assert.equal(modelApp('claude-opus-5-5').id, 'claude');
  assert.equal(modelApp('qwen3:8b').id, 'local');
  assert.equal(modelApp('auto'), null);
  assert.equal(modelApp(''), null);
});

test('the Models line counts each app once, with the agents that used it and its tokens', () => {
  const used = modelsUsed([
    { name: 'Team Coordinator', model: 'subscription:claude/sonnet' },
    { name: 'QA Claude Writer', model: 'subscription:claude' },
    { name: 'QA Codex Frontend', model: 'subscription:codex' },
    { name: 'QA Google Tester', model: 'subscription:gemini' },
    { name: 'QA Google Tester', model: 'subscription:gemini' },
    { name: 'Nobody', model: 'auto' },
  ], [{ model: 'subscription:claude/sonnet', tokensIn: 1000, tokensOut: 500, replies: 2 }, { model: 'qwen3:8b', tokensIn: 9, tokensOut: 9, replies: 1 }], m => `label:${m}`);
  assert.deepEqual(used.map(u => [u.app.name, u.agents.length, u.tokens]), [['Claude Code', 2, 1500], ['Codex', 1, 0], ['Gemini', 1, 0]]);
  assert.deepEqual(used[0].agents, [{ name: 'Team Coordinator', label: 'label:subscription:claude/sonnet' }, { name: 'QA Claude Writer', label: 'label:subscription:claude' }]);
});

test('the marks are the vendored brand icons; a local model draws the chip from our icon set', () => {
  const html = (id) => renderToStaticMarkup(React.createElement(AppMark, { app: modelApp(id), size: 10 }));
  assert.match(html('subscription:claude'), /#D97757/);
  assert.match(html('subscription:codex'), /currentColor/);
  assert.match(html('subscription:gemini'), /<img/);
  assert.match(html('qwen3:8b'), /<svg/);
  for (const id of ['subscription:claude', 'subscription:codex', 'subscription:gemini', 'qwen3:8b']) assert.doesNotMatch(html(id), /https?:\/\//, 'never loaded from the internet');
});

test('wiring: face badge and mark before the app name on every Team row, Team title, Models chips with a hover card that opens Context by model', () => {
  assert.match(src, /<Row face=\{lead\} badge=\{modelApp\(leadModel\)\}/);
  assert.match(src, /face=\{d\.agentName\} badge=\{modelApp\(d\.model\)\}/);
  assert.match(src, /Handed a part · \{answers\(d\.model\)\}/);
  assert.match(src, /`\$\{people\} \$\{people === 1 \? 'agent' : 'agents'\}/);
  assert.match(src, /className="details-models" aria-label="Models in this chat"/);
  assert.match(src, /role="tooltip"/);
  assert.match(src, /Used by \{u\.agents\.map\(a => a\.name\)\.join\(', '\)\}/);
  assert.match(src, /onClick=\{\(\) => \{ setCard\(null\); setByModel\(true\); \}\}/);
  assert.match(src, /onFocus=\{\(\) => setCard\(u\.app\.id\)\}/, 'the hover card also opens from the keyboard');
  assert.match(src, /On this computer · \$\{words\}/);
  assert.match(src, /Sign in…<\/button>/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'ChatView.tsx'), 'utf8'), /onSignIn=\{onSetUpModel\}/);
});
