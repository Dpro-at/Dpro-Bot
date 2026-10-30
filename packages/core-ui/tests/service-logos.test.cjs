// Brand marks of services and channels (page audit A5): bundled, matched by id or name, letter tile otherwise.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { ServiceLogo, serviceMark } = require('../src/ServiceLogo.tsx');

test('channels and MCP connections get their mark; unknown ones keep the letter tile', () => {
  for (const id of ['telegram', 'whatsapp', 'whatsapp_cloud', 'discord', 'slack', 'signal', 'matrix', 'line', 'google_chat', 'weixin', 'qqbot']) assert.ok(serviceMark(id), id);
  for (const name of ['GitHub', 'notion', 'Linear', 'my-github-tools', 'Sentry']) assert.ok(serviceMark(name), name);
  for (const none of ['email', 'sms', 'genvr-local', '', null]) assert.equal(serviceMark(none), null, String(none));
  const html = renderToStaticMarkup(React.createElement(ServiceLogo, { id: 'telegram' }));
  assert.match(html, /<svg[^>]*class="service-logo"/);
  assert.match(html, /fill="#26A5E4"/);
  assert.match(renderToStaticMarkup(React.createElement(ServiceLogo, { id: 'github' })), /fill="currentColor"/, 'a near-black mark follows the text colour');
});

test('the marks are bundled with their licences, never loaded from the internet', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/service-logo-data.ts'), 'utf8');
  assert.match(src, /Licences \(per mark\): .*telegram CC0-1\.0/);
  assert.doesNotMatch(src, /https?:\/\//);
});

test('CHANNELS-01: every catalog channel shows its brand mark or a plain glyph, never a letter tile', () => {
  const path = require('node:path');
  const { CHANNEL_CATALOG } = require(path.resolve(__dirname, '../../backend/node_modules/agent-connect-dpro/dist/catalog.js'));
  const { ChannelMark, channelGlyph } = require('../src/AgentConnectSettings.tsx');
  const generic = [];
  for (const c of CHANNEL_CATALOG) {
    const html = renderToStaticMarkup(React.createElement(ChannelMark, { id: c.id, size: 17 }));
    assert.match(html, /^<svg/, c.id);
    if (!serviceMark(c.id)) generic.push(c.id);
  }
  for (const id of ['telegram', 'discord', 'slack', 'whatsapp', 'whatsapp_cloud', 'signal', 'matrix', 'mattermost', 'line', 'google_chat', 'homeassistant', 'weixin', 'qqbot', 'ntfy']) assert.ok(!generic.includes(id), id);
  assert.deepEqual([channelGlyph('email'), channelGlyph('sms'), channelGlyph('webhook'), channelGlyph('api_server'), channelGlyph('relay'), channelGlyph('teams'), channelGlyph('__proto__')],
    ['inbox', 'phone', 'link', 'server', 'wifi', 'message', 'message']);
});
