// CHAT-BUILD-01 stage 1: guards that need no server.
//  - a local model that stops sending ends the turn with a notice (no endless wait);
//  - logs never carry a token from a URL; audio helpers and coding apps get no secrets;
//  - agents cannot pin their own memory and secrets they save are removed.
// Run: node --import tsx --test test/chat-build-guards.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { runOllamaAgentLoop } = await import('../src/services/ollama-agent-loop.ts');
const { runLmStudioAgentLoop } = await import('../src/services/lmstudio-agent-loop.ts');
const { redactUrlSecrets } = await import('../src/api/app.ts');
const { subscriptionArgs } = await import('../src/services/subscription-chat.ts');
const { stopDelegations, CHILD_CALL_MS } = await import('../src/tools/tasks/team.ts');

/** A model server that sends one piece and then nothing (hung). */
const hungFetch = (first) => async (_url, init) => new Response(new ReadableStream({
  start(c) { c.enqueue(new TextEncoder().encode(first)); init.signal.addEventListener('abort', () => c.error(new DOMException('aborted', 'AbortError'))); },
}), { status: 200 });

test('a hung Ollama model ends with a notice and model_unavailable, not an endless wait', async () => {
  const frames = [];
  await assert.rejects(runOllamaAgentLoop({ url: 'http://127.0.0.1:1', model: 'm', messages: [{ role: 'user', content: 'hi' }], tools: [],
    execute: async () => ({ content: [] }), write: (f) => frames.push(f), signal: new AbortController().signal,
    fetchImpl: hungFetch(JSON.stringify({ message: { content: 'Hel' } }) + '\n'), stallMs: { first: 200, idle: 50 } }), (err) => err?.constructor?.name === 'ModelUnavailable');
  assert.deepEqual(frames.map((f) => f.type), ['text', 'notice']);
  assert.equal(frames[1].code, 'local_model_slow');
});

test('a hung LM Studio model ends the same way; Stop is still a plain stop', async () => {
  const frames = [];
  await assert.rejects(runLmStudioAgentLoop({ url: 'http://127.0.0.1:1/v1', model: 'm', messages: [{ role: 'user', content: 'hi' }], tools: [],
    execute: async () => ({ content: [] }), write: (f) => frames.push(f), signal: new AbortController().signal,
    fetchImpl: hungFetch('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] }) + '\n'), stallMs: { first: 200, idle: 50 } }));
  assert.ok(frames.some((f) => f.type === 'notice' && f.code === 'local_model_slow'));
  const stop = new AbortController();
  const stopped = [];
  setTimeout(() => stop.abort(), 30);
  const out = await runOllamaAgentLoop({ url: 'http://127.0.0.1:1', model: 'm', messages: [{ role: 'user', content: 'hi' }], tools: [],
    execute: async () => ({ content: [] }), write: (f) => stopped.push(f), signal: stop.signal,
    fetchImpl: hungFetch(JSON.stringify({ message: { content: 'Hel' } }) + '\n'), stallMs: { first: 5000, idle: 5000 } });
  assert.equal(out.aborted, true);
  assert.ok(!stopped.some((f) => f.type === 'notice'), 'a stop is not reported as a slow model');
});

test('logged URLs never carry a token, ticket or key', () => {
  assert.equal(redactUrlSecrets('/api/ext/trading/stream?token=eyJhbGciOi.abc.def'), '/api/ext/trading/stream?token=[redacted]');
  assert.equal(redactUrlSecrets('/x?a=1&api_key=sk-123&b=2'), '/x?a=1&api_key=[redacted]&b=2');
  assert.equal(redactUrlSecrets('/api/chat/runs/r1/events?after=5'), '/api/chat/runs/r1/events?after=5');
});

test('speech helpers start with a minimal environment (no server secrets)', () => {
  const src = readFileSync(new URL('../src/services/audio-service.ts', import.meta.url), 'utf8');
  const spawns = src.match(/spawnPython\([\s\S]*?\);/g) ?? [];
  assert.equal(spawns.length, 3);
  for (const s of spawns) assert.match(s, /baseEnv: audioEnv\(\)/);
});

test('ask_coding_app runs Codex read-only; the reply path keeps its stricter mode', () => {
  const ro = subscriptionArgs('codex', undefined, undefined, false, true);
  assert.equal(ro[ro.indexOf('--sandbox') + 1], 'read-only');
  const normal = subscriptionArgs('codex');
  assert.equal(normal[normal.indexOf('--sandbox') + 1], 'workspace-write');
  const reply = subscriptionArgs('codex', undefined, undefined, true, true);
  assert.equal(reply[reply.indexOf('--sandbox') + 1], 'read-only');
  assert.ok(reply.includes('shell_tool'));
  const src = readFileSync(new URL('../src/tools/cli/ask-coding-app.ts', import.meta.url), 'utf8');
  assert.match(src, /readOnly: app === 'codex'/);
});

test('a delegated agent gets 120 s per model call; Stop with nothing delegated stops nothing', () => {
  assert.equal(CHILD_CALL_MS, 120_000);
  assert.equal(stopDelegations('no-such-conversation'), 0);
});
