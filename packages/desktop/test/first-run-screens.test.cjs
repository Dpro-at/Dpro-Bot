'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pages = path.join(__dirname, '..', 'src', 'pages');
class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.hidden = false; this.disabled = false; this.textContent = ''; this.attributes = {}; this.open = false; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

async function openWelcome(rows) {
  const ids = ['error', 'status', 'sources', 'primary', 'folder', 'connect', 'separate', 'separate-confirm', 'cancel-separate', 'confirm-separate'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element(id === 'primary' ? 'button' : 'div')]));
  const calls = [];
  const api = {
    discoverData: async () => rows,
    newWorkspace: async confirmed => { calls.push(['newWorkspace', confirmed]); return { ok: true }; },
    selectData: async dir => { calls.push(['selectData', dir]); return { ok: true }; },
    findData: async () => ({ ok: true }),
    openConnect: async () => ({ ok: true }),
  };
  const context = {
    window: { dproDesktop: api },
    document: { getElementById: id => elements[id], createElement: tag => new Element(tag) },
  };
  vm.runInNewContext(fs.readFileSync(path.join(pages, 'welcome.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return { elements, calls };
}

test('first-run welcome has one direct setup action and explicit return/connect links', async () => {
  const html = fs.readFileSync(path.join(pages, 'welcome.html'), 'utf8');
  assert.match(html, /Set up Girru on this computer/);
  assert.match(html, /I used Girru before/);
  assert.match(html, /Connect to a Girru on another computer/);
  assert.doesNotMatch(html, /<details|type="checkbox"|id="confirm"/);

  const { elements, calls } = await openWelcome([]);
  assert.equal(elements.primary.textContent, 'Set up Girru on this computer');
  await elements.primary.onclick();
  assert.deepEqual(calls, [['newWorkspace', true]]);
});

test('one verified workspace opens directly; ambiguous and unreadable workspaces remain explicit', async () => {
  const single = await openWelcome([{ dir: '/fictional/workspace', state: 'existing', ownerName: 'Mohamed', agents: 8, lastUsed: '2026-10-30 09:00:00' }]);
  assert.equal(single.elements.primary.textContent, 'Open my workspace');
  await single.elements.primary.onclick();
  assert.deepEqual(single.calls, [['selectData', '/fictional/workspace']]);
  const summary = single.elements.sources.children[0].children[0].children[1].textContent;
  assert.match(summary, /Mohamed/);
  assert.match(summary, /8 agents/);
  assert.match(summary, /Last used/);
  assert.doesNotMatch(summary, /fictional\/workspace/);

  const multiple = await openWelcome([
    { dir: '/fictional/a', state: 'existing' },
    { dir: '/fictional/b', state: 'unreadable' },
  ]);
  assert.equal(multiple.elements.primary.textContent, 'Open my workspace');
  assert.equal(multiple.elements.sources.hidden, false);
  assert.match(multiple.elements.sources.children[1].children[0].children[1].textContent, /Could not verify/);
  assert.equal(multiple.elements.sources.children[1].children.length, 1, 'unreadable data has no open action');
  assert.equal(multiple.elements.primary.disabled, false, 'the verified workspace remains openable');
  assert.equal(multiple.elements.separate.hidden, false);
  multiple.elements.separate.onclick();
  assert.equal(multiple.elements['separate-confirm'].open, true);
  await multiple.elements['confirm-separate'].onclick();
  assert.deepEqual(multiple.calls, [['newWorkspace', true]]);
});

test('welcome back opens the selected earlier workspace from its main action', async () => {
  const multiple = await openWelcome([
    { dir: '/fictional/older', state: 'existing', ownerName: 'Older' },
    { dir: '/fictional/newer', state: 'existing', ownerName: 'Newer' },
  ]);
  assert.equal(multiple.elements.primary.textContent, 'Open my workspace');
  multiple.elements.sources.children[1].children[0].onclick();
  await new Promise(resolve => setImmediate(resolve));
  await multiple.elements.primary.onclick();
  assert.deepEqual(multiple.calls, [['selectData', '/fictional/newer']]);
});

test('failed-start screen provides retry, log, and connect actions', () => {
  const html = fs.readFileSync(path.join(pages, 'failed.html'), 'utf8');
  const script = fs.readFileSync(path.join(pages, 'failed.js'), 'utf8');
  assert.match(html, /Try again/);
  assert.match(html, /Show the log/);
  assert.match(script, /showLogs\(\)/);
  assert.match(script, /openConnect\(\)/);
});

test('startup screen announces real stages without claiming a numeric percentage', () => {
  const html = fs.readFileSync(path.join(pages, 'starting.html'), 'utf8');
  const script = fs.readFileSync(path.join(pages, 'starting.js'), 'utf8');
  assert.match(html, /role="progressbar"/);
  assert.doesNotMatch(html, /aria-valuenow=/);
  const status = new Element('p');
  let receive;
  const context = {
    window: {
      location: { search: '?status=Preparing%20your%20workspace%E2%80%A6' },
      dproDesktop: { onStartupStatus: callback => { receive = callback; } },
    },
    URLSearchParams,
    document: { getElementById: id => id === 'start-status' ? status : null },
  };
  vm.runInNewContext(script, context);
  assert.equal(status.textContent, 'Preparing your workspace…');
  receive('Starting the local engine…');
  assert.equal(status.textContent, 'Starting the local engine…');
  receive('Invented status');
  assert.equal(status.textContent, 'Starting the local engine…');
});

test('earlier data that cannot be opened never blocks setup: the main action asks once, then sets up beside it', async () => {
  const { elements, calls } = await openWelcome([{ dir: '/fictional/broken', state: 'unreadable' }]);
  assert.equal(elements.primary.textContent, 'Set up Girru on this computer');
  assert.equal(elements.primary.disabled, false);
  elements.primary.onclick();
  assert.equal(elements['separate-confirm'].open, true, 'the confirm sheet opens instead of a silent new workspace');
  assert.deepEqual(calls, []);
  await elements['confirm-separate'].onclick();
  assert.deepEqual(calls, [['newWorkspace', true]]);
});
