require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient } = require('../src/session.ts');
const { AccountSettings } = require('../src/SettingsAccount.tsx');
const { createLoginMock } = require('../src/session-mock.ts');

test('Settings › Account: who you are, two-step sign-in in place, this session; sign out everywhere asks once; no requests', async () => {
  const calls = []; const base = createLoginMock();
  const client = new SessionClient({ mock: async r => { calls.push(r); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const before = calls.length;
  const html = renderToStaticMarkup(React.createElement(AccountSettings, { client }));
  assert.equal(calls.length, before, 'no request from rendering');
  assert.match(html, /<bdi>Offline demo<\/bdi>/);
  assert.match(html, /demo@example\.invalid/);
  assert.match(html, /Owner of this workspace/);
  assert.match(html, /aria-label="Two-step sign-in"/);
  assert.doesNotMatch(html, /Not supported/);
  assert.match(html, /offline practice with fictional data/);
  assert.match(html, />Sign out everywhere…</);
  assert.doesNotMatch(html, /<dialog/, 'the confirmation opens only on request');
});
