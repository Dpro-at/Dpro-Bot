// CHAT-BUILD-01 stage 4 (CH8): the side panel — status line, parts with folds and order, the rail, the schedule.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readPanel, movePart, DEFAULT_PANEL, scheduleWords } = require('../src/ChatDetails.tsx');
const { allowedConversation: allow, conversationResponse: res } = require('../src/conversation-contract.js');
const CID = '3f0c2b6e-1d2a-4f4e-9b1a-6c7d8e9f0a1b';

test('panel layout: known parts only, missing ones added; parts move one place at a time', () => {
  assert.deepEqual(DEFAULT_PANEL.order, ['place', 'team', 'results', 'memory', 'mcp']);
  assert.deepEqual(readPanel({ order: ['mcp', 'nope', 'mcp'], folded: ['team', 'x'] }), { order: ['mcp', 'place', 'team', 'results', 'memory'], folded: ['team'] });
  assert.deepEqual(movePart(['place', 'team'], 'team', -1), ['team', 'place']);
  assert.deepEqual(movePart(['place', 'team'], 'place', -1), ['place', 'team']);
});

test('schedule words read like a sentence', () => {
  assert.equal(scheduleWords({ every: 'daily', at: '09:00', weekday: null }), 'Runs every day at 09:00');
  assert.equal(scheduleWords({ every: 'weekly', at: '08:30', weekday: 1 }), 'Runs every Monday at 08:30');
  assert.equal(scheduleWords({ every: 'hourly', at: '00:15', weekday: null }), 'Runs every hour at :15');
});

test('contract: usage, team, schedule, stop and panel; a chat in the list carries its next scheduled run', () => {
  for (const k of ['usage', 'team', 'schedule']) assert.equal(allow('GET', `/api/chat/conversations/${CID}/${k}`, undefined), true, k);
  assert.equal(allow('POST', `/api/chat/conversations/${CID}/stop`, undefined), true);
  assert.equal(allow('PUT', `/api/chat/conversations/${CID}/schedule`, { every: 'daily', at: '09:00', message: 'Check' }), true);
  assert.equal(allow('PUT', `/api/chat/conversations/${CID}/schedule`, { every: 'daily', at: '9am', message: 'Check' }), false);
  assert.equal(allow('PUT', '/api/chat/panel', { order: ['team'], folded: [] }), true);
  assert.equal(allow('PUT', '/api/chat/panel', { order: ['nope'] }), false);
  const team = res(`/api/chat/conversations/${CID}/team`, 200, { team: [{ agentId: 'qa', agentName: 'QA', model: 'm', status: 'weird', at: 'x' }] }).team;
  assert.equal(team[0].status, 'failed', 'unknown states are never shown as working');
  const list = res('/api/chat/conversations', 200, { conversations: [{ id: CID, title: 't', agentId: null, projectId: null, pinned: false, preview: '', createdAt: '', updatedAt: '', schedule: { next: 'Tue 09:00', paused: false } }] }).conversations;
  assert.deepEqual(list[0].schedule, { next: 'Tue 09:00', paused: false });
});
