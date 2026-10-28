// CH8 Results colours: the pull request line passes the contract and shows in the git colours.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { allowedConversation, conversationResponse: res } = require('../src/conversation-contract.js');
const PID = '9a8b7c6d-1d2a-4f4e-9b1a-6c7d8e9f0a1b';
const P = `/api/chat/projects/${PID}/pr`;

test('the pull request path is a plain read, for a project id only', () => {
  assert.equal(allowedConversation('GET', P, undefined), true);
  for (const [m, p, b] of [['POST', P, {}], ['PUT', P, {}], ['GET', P, {}], ['GET', '/api/chat/projects/../pr', undefined], ['GET', `${P}?fresh=1`, undefined]]) assert.equal(allowedConversation(m, p, b), false, `${m} ${p}`);
});

test('only a GitHub pull request link and the four states pass; checks are one of three or none', () => {
  const ok = { number: 38, title: 'Fixes', state: 'open', url: 'https://github.com/acme/widgets/pull/38', checks: 'failing' };
  assert.deepEqual(res(P, 200, { pr: ok }), { pr: ok });
  assert.deepEqual(res(P, 200, { pr: { ...ok, checks: 'weird', token: 'ghp_secret' } }), { pr: { ...ok, checks: null } });
  for (const bad of [{ url: 'https://evil.example/acme/widgets/pull/38' }, { url: 'javascript:alert(1)' }, { state: 'reopened' }, { number: -1 }])
    assert.deepEqual(res(P, 200, { pr: { ...ok, ...bad } }), { pr: null }, JSON.stringify(bad));
  assert.deepEqual(res(P, 200, { pr: null, unavailable: true }), { pr: null, unavailable: true });
});

test('the Results card colours the state and the checks dot, and is quiet when GitHub cannot be asked', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'src', 'ChatView.tsx'), 'utf8');
  assert.match(view, /'Pull request state unavailable'/);
  assert.match(view, /pr=\{owner && client \?/, 'owner only');
  assert.match(view, /addEventListener\('focus', focus\)/, 'read again when the window comes back');
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  for (const [state, colour] of [['open', '--pr-open'], ['merged', '--pr-merged'], ['closed', '--pr-closed']]) assert.match(css, new RegExp(`\\.pr-dot\\[data-state="${state}"\\] \\{ background:var\\(${colour}\\)`));
  assert.match(css, /--pr-open:#1A7F37; --pr-merged:#8250DF; --pr-closed:#CF222E; --pr-draft:#6E7781/);
  for (const c of ['passing', 'pending', 'failing']) assert.match(css, new RegExp(`\\.pr-checks\\[data-checks="${c}"\\] \\.pr-dot`));
});
