// CH3: the Thinking choice reaches only a model that can think; a non-thinking model never gets a level it ignores.
// Run: node --import tsx --test test/chat-thinking-models.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
delete process.env.OLLAMA_THINK;
const { chatThinkFor } = await import('../src/llm/ollama.ts');

test('a thinking local model gets Quick/Deep; Normal keeps the server default', () => {
  const caps = ['completion', 'tools', 'thinking'];
  assert.deepEqual(chatThinkFor('deep', caps), { think: true, thinkOptional: true });
  assert.deepEqual(chatThinkFor('quick', caps), { think: false, thinkOptional: true });
  assert.deepEqual(chatThinkFor('normal', caps), {});
  assert.deepEqual(chatThinkFor(undefined, caps), {});
});

test('a model that says it cannot think gets no level; unknown capabilities keep the optional flag', () => {
  for (const t of ['deep', 'quick', 'normal']) assert.deepEqual(chatThinkFor(t, ['completion', 'tools']), {}, t);
  assert.deepEqual(chatThinkFor('deep', []), { think: true, thinkOptional: true });
  assert.deepEqual(chatThinkFor('deep'), { think: true, thinkOptional: true });
});

test('the model list marks what can think: Claude, Claude Code and Codex, local models by their own capabilities', () => {
  const src = readFileSync(new URL('../src/api/routes/models.ts', import.meta.url), 'utf8');
  assert.match(src, /\.\.\.\(kind!=='gemini'\?\{think:true\}:\{\}\)/);
  assert.match(src, /m\.capabilities\.includes\('thinking'\) \? \{ think: true \}/);
  assert.doesNotMatch(src.slice(src.indexOf('// 3. Add OpenAI models')), /think:/);
  const chat = readFileSync(new URL('../src/api/routes/chat.ts', import.meta.url), 'utf8');
  assert.match(chat, /\.\.\.chatThinkFor\(thinking, thinkCaps\)/);
});
