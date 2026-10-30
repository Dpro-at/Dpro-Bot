require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { allowedRequest } = require('../src/session.ts');
const { allowedFirstRun, firstRunResponse, firstRunRoute } = require('../src/first-run-contract.js');
const { SetupSteps } = require('../src/FirstRunSetup.tsx');
const { NoticeCard, MomentsContext } = require('../src/ChatMoments.tsx');

test('FIRSTRUN-01 contract: only the four paths and their exact shapes pass', () => {
  assert.equal(firstRunRoute('/api/first-run'), true);
  assert.equal(firstRunRoute('/api/first-run/other'), false);
  assert.equal(allowedFirstRun('GET', '/api/first-run', undefined), true);
  assert.equal(allowedFirstRun('PUT', '/api/first-run', { step: 'team' }), true);
  assert.equal(allowedFirstRun('PUT', '/api/first-run', { step: 'team', extra: 1 }), false);
  assert.equal(allowedFirstRun('PUT', '/api/first-run', { step: 'anything' }), false);
  assert.equal(allowedFirstRun('POST', '/api/first-run/finish', undefined), true);
  assert.equal(allowedFirstRun('POST', '/api/first-run/tools', undefined), false);
  assert.equal(allowedRequest('GET', '/api/first-run/local-model', undefined), true, 'the page client allows it too');
});

test('FIRSTRUN-01 contract: commands stay single lines; unknown tools and fields are dropped', () => {
  const tools = firstRunResponse('/api/first-run/tools', 200, { tools: [
    { id: 'claude', name: 'Claude Code', installed: true, signedIn: true, install: null, signIn: 'claude', secret: 'x' },
    { id: 'gemini', name: 'Gemini CLI', installed: false, signedIn: false, install: 'npm install -g @google/gemini-cli\nrm -rf ~', signIn: 'gemini' },
    { id: 'other', name: 'Other', installed: true, signedIn: true, install: null, signIn: 'x' }] });
  assert.deepEqual(tools, { tools: [{ id: 'claude', name: 'Claude Code', installed: true, signedIn: true, install: null, signIn: 'claude' }] });
  const local = firstRunResponse('/api/first-run/local-model', 200, { memoryGb: 16.2, recommended: 'qwen3.5:9b', ollama: false, installed: [], download: 'https://example.invalid/x',
    choices: [{ id: 'qwen3.5:9b', label: 'Qwen 3.5 · 9B', sizeGb: 6, note: 'Best balance.' }], commands: { 'qwen3.5:9b': 'ollama pull qwen3.5:9b' } });
  assert.equal(local.memoryGb, 16);
  assert.equal(local.download, null, 'only the Ollama download page passes');
  assert.equal(local.commands['qwen3.5:9b'], 'ollama pull qwen3.5:9b');
  assert.deepEqual(firstRunResponse('/api/first-run', 403, {}), { code: 'forbidden' });
});

test('setup steps show the four steps with the current one marked', () => {
  const html = renderToStaticMarkup(React.createElement(SetupSteps, { current: 'Local model' }));
  for (const s of ['Account', 'AI tools', 'Local model', 'Team']) assert.match(html, new RegExp(s));
  assert.match(html, /aria-current="step"[^>]*>Local model/);
});

test('the Main agent\'s setup question shows its answers as buttons that fill the box', () => {
  const drafted = [];
  const html = renderToStaticMarkup(React.createElement(MomentsContext.Provider, { value: { onDraft: t => drafted.push(t) } },
    React.createElement(NoticeCard, { part: { kind: 'notice', code: 'choices', text: 'Here in Girru\nTelegram\nWhatsApp' } })));
  assert.match(html, /aria-label="Quick answers"/);
  assert.equal((html.match(/class="moment-choice"/g) || []).length, 3);
});
