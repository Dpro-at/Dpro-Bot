// A coding app that writes the tool's own name as the type still makes a call, but only for an offered tool.
import test from 'node:test';
import assert from 'node:assert/strict';
import { subscriptionToolLoop } from '../src/services/subscription-tool-loop.ts';

const tools = [{ name: 'plan_steps', description: 'plan', input_schema: { type: 'object', properties: {} } }];
async function loop(first) {
  const calls = []; let n = 0;
  const answer = await subscriptionToolLoop({ prompt: 'p', signal: new AbortController().signal, tools,
    reply: async () => (n++ === 0 ? first : JSON.stringify({ type: 'answer', text: 'done' })),
    execute: async (name, args) => { calls.push([name, args]); return { content: [{ type: 'text', text: 'ok' }] }; } });
  return { answer, calls };
}

test('{"type":"<tool name>","name":"<tool name>"} runs the offered tool', async () => {
  const r = await loop(JSON.stringify({ type: 'plan_steps', name: 'plan_steps', arguments: { steps: [] } }));
  assert.deepEqual(r.calls, [['plan_steps', { steps: [] }]]);
  assert.equal(r.answer, 'done');
});

test('a name that is not offered, or a type that differs from the name, stays plain text', async () => {
  for (const row of [{ type: 'exec', name: 'exec', arguments: {} }, { type: 'plan', name: 'plan_steps', arguments: {} }]) {
    const r = await loop(JSON.stringify(row));
    assert.deepEqual(r.calls, []);
    assert.equal(r.answer, JSON.stringify(row));
  }
});
