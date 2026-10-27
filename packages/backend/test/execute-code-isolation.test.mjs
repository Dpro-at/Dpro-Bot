// SEC-DEP-02: agent code runs in its own permission-restricted process, not in vm2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runIsolated } from '../src/tools/core/execute-code.ts';

const calls = [];
const toolbox = {
  echo: async p => { calls.push(p); return { got: p }; },
  fail: async () => { throw new Error('tool said no'); },
  sleep: async () => {}, now: () => 0,
};

test('returns strings, JSON and empty results; toolbox calls go through the parent', async () => {
  assert.deepEqual(await runIsolated('return "hi"', 5000, toolbox), { kind: 'string', text: 'hi', type: 'string' });
  assert.equal((await runIsolated('return { a: 1 }', 5000, toolbox)).text, JSON.stringify({ a: 1 }, null, 2));
  assert.equal((await runIsolated('const x = 1;', 5000, toolbox)).kind, 'empty');
  const r = await runIsolated('const r = await toolbox.echo({ n: 2 }); return r.got.n + 1', 5000, toolbox);
  assert.equal(r.text, '3'); assert.deepEqual(calls.at(-1), { n: 2 });
  await assert.rejects(runIsolated('await toolbox.fail()', 5000, toolbox), /tool said no/);
  await assert.rejects(runIsolated('throw new Error("boom")', 5000, toolbox), /boom/);
});

test('the code sees no require, process or way to build code from strings', async () => {
  assert.equal((await runIsolated('return [typeof require, typeof process, typeof fetch, typeof globalThis.toolbox.exec].join()', 5000, toolbox)).text, 'undefined,undefined,undefined,undefined');
  for (const escape of [
    'return this.constructor.constructor("return process")().env',
    'return toolbox.echo.constructor("return process")().env',
    'return console.log.constructor("return process")().pid',
    'return eval("1+1")',
    'return new Function("return 1")()',
  ]) await assert.rejects(runIsolated(escape, 5000, toolbox), /Code generation from strings disallowed|EvalError|not allowed|disallowed/i, escape);
});

test('an endless loop is killed at the time limit', async () => {
  const t = Date.now();
  await assert.rejects(runIsolated('while (true) {}', 800, toolbox), /timed out/);
  assert.ok(Date.now() - t < 5000);
});

test('too many toolbox calls and too much memory stop the code', async () => {
  await assert.rejects(runIsolated('for (let i = 0; i < 300; i++) await toolbox.echo({ i });', 20000, toolbox), /more than 200 toolbox calls/);
  await assert.rejects(runIsolated('const a = []; while (true) a.push(new Array(1e6).fill(1));', 30000, toolbox), /memory|stopped/i);
});

test('the child process gets no environment and Node permission flags', () => {
  const src = readFileSync(new URL('../src/tools/core/execute-code.ts', import.meta.url), 'utf8');
  assert.match(src, /'--permission', '--disallow-code-generation-from-strings'/);
  assert.match(src, /process\.versions\.electron \? \{ ELECTRON_RUN_AS_NODE: '1' \} : \{\}/);
  assert.doesNotMatch(src, /vm2/);
});
