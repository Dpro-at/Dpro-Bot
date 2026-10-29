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

test('a tool request written as <invoke> is asked again once as JSON, then runs; it never shows as the reply', async () => {
  const xml = '<invoke name="plan_steps">\n<parameter name="steps">[]</parameter>\n</invoke>';
  const replies = [xml, JSON.stringify({ type: 'tool', name: 'plan_steps', arguments: { steps: [] } }), JSON.stringify({ type: 'answer', text: 'done' })];
  const prompts = []; const calls = [];
  const answer = await subscriptionToolLoop({ prompt: 'p', signal: new AbortController().signal, tools,
    reply: async (p) => { prompts.push(p); return replies.shift(); },
    execute: async (name, args) => { calls.push([name, args]); return { content: [{ type: 'text', text: 'ok' }] }; } });
  assert.equal(answer, 'done');
  assert.deepEqual(calls, [['plan_steps', { steps: [] }]]);
  assert.match(prompts[1], /Your last reply was not one JSON object/);
});

test('the ask-again happens once; an <invoke> of a tool not offered, or plain prose, stays the reply', async () => {
  const xml = '<invoke name="plan_steps"></invoke>';
  let n = 0;
  const twice = await subscriptionToolLoop({ prompt: 'p', signal: new AbortController().signal, tools, reply: async () => { n++; return xml; }, execute: async () => ({ content: [] }) });
  assert.equal(twice, xml); assert.equal(n, 2);
  for (const text of ['<invoke name="exec"></invoke>', 'Here is the report.']) {
    let k = 0;
    const r = await subscriptionToolLoop({ prompt: 'p', signal: new AbortController().signal, tools, reply: async () => { k++; return text; }, execute: async () => ({ content: [] }) });
    assert.equal(r, text); assert.equal(k, 1);
  }
});
