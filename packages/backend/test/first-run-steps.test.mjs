// FIRSTRUN-01: a new owner gets the setup steps once; tools, local model and the Welcome chat.
// Run: node --import tsx --test test/first-run-steps.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-first-run-steps-'));
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { default: Fastify } = await import('fastify');
const { default: setupRoutes } = await import('../src/api/routes/setup.ts');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const { firstRunRoutes } = await import('../src/api/routes/first-run.ts');
const { issueSetupToken } = await import('../src/auth/setup-token.ts');
const { aiTools, localModelStep, localModelCommand, recommendedLocal, welcomeText, firstRunState } = await import('../src/onboarding/first-run.ts');
const { listConversationMessages } = await import('../src/repositories/chat-conversations.ts');

const db = getDatabase();
await db.initialize();
const app = Fastify();
await app.register(setupRoutes);
await app.register(authRoutes);
await app.register(firstRunRoutes);
await app.ready();
test.after(async () => { await app.close(); closeDatabase(); rmSync(dir, { recursive: true, force: true }); });

const OWNER = { name: 'Mohamed Test', email: 'owner@example.test', password: 'Fresh-Install-Pass-42!' };
let token = '';
const call = (method, url, payload) => app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });

test('a new owner starts the setup steps at AI tools; steps are remembered', async () => {
  assert.equal((await app.inject({ method: 'POST', url: '/api/setup/admin', payload: { ...OWNER, setupToken: issueSetupToken() } })).statusCode, 200);
  token = (await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: OWNER.email, password: OWNER.password } })).json().token;
  assert.deepEqual((await call('GET', '/api/first-run')).json(), { pending: true, step: 'tools' });
  assert.equal((await call('PUT', '/api/first-run', { step: 'team' })).json().step, 'team');
  assert.equal((await call('PUT', '/api/first-run', { step: 'nowhere' })).statusCode, 400);
  assert.equal((await app.inject({ method: 'GET', url: '/api/first-run' })).statusCode, 401, 'owner only');
});

test('an owner without the first-run row (existed before) never sees the steps', async () => {
  assert.deepEqual(await firstRunState('someone-older'), { pending: false, step: 'tools' });
});

test('AI tools: installed and signed-in states come from the tools\' own files, commands are fixed text', async () => {
  const home = join(dir, 'fake-home'), bin = join(home, 'bin');
  mkdirSync(bin, { recursive: true });
  for (const name of ['claude', 'codex', 'npm']) { writeFileSync(join(bin, name), '#!/bin/sh\n'); chmodSync(join(bin, name), 0o755); }
  writeFileSync(join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'x@example.test' } }));
  const tools = await aiTools({ home, platform: 'darwin', dirs: [bin] });
  const byId = Object.fromEntries(tools.map(t => [t.id, t]));
  assert.deepEqual([byId.claude.installed, byId.claude.signedIn, byId.claude.install], [true, true, null]);
  assert.deepEqual([byId.codex.installed, byId.codex.signedIn, byId.codex.signIn], [true, false, 'codex login']);
  assert.deepEqual([byId.gemini.installed, byId.gemini.install], [false, 'npm install -g @google/gemini-cli']);
  assert.ok(!JSON.stringify(tools).includes('x@example.test'), 'no account detail is returned');
});

test('local model: recommendation by memory; command installs Ollama first only when missing', async () => {
  assert.equal(recommendedLocal(8).id, 'qwen3:4b');
  assert.equal(recommendedLocal(16).id, 'qwen3:4b');
  assert.equal(recommendedLocal(32).id, 'qwen3.5:9b', 'one size below what the memory holds');
  assert.equal(recommendedLocal(64).id, 'qwen3:14b');
  const missing = await localModelStep({ home: dir, platform: 'linux', dirs: [], memoryBytes: 32 * 1024 ** 3, models: async () => [] });
  assert.equal(missing.recommended, 'qwen3.5:9b');
  assert.equal(localModelCommand(missing, 'qwen3.5:9b'), 'curl -fsSL https://ollama.com/install.sh | sh && ollama pull qwen3.5:9b');
  assert.equal(localModelCommand(missing, 'rm -rf /'), null, 'only listed models');
  // What is already in Ollama comes first; an embedding model is not offered.
  const has = await localModelStep({ home: dir, platform: 'linux', dirs: [], memoryBytes: 32 * 1024 ** 3,
    models: async () => [{ name: 'qwen3-embedding:0.6b', size: 6e8, chat: false }, { name: 'llama3.2:3b', size: 2e9, chat: true }] });
  assert.equal(has.recommended, 'llama3.2:3b');
  assert.deepEqual(has.installed, ['llama3.2:3b']);
  assert.deepEqual(has.choices.map(c => c.id), ['llama3.2:3b', 'qwen3:4b', 'qwen3.5:9b', 'qwen3:14b']);
  const listedHas = await localModelStep({ home: dir, platform: 'linux', dirs: [], memoryBytes: 32 * 1024 ** 3, models: async () => [{ name: 'qwen3:4b', size: 3e9, chat: true }] });
  assert.equal(listedHas.recommended, 'qwen3:4b', 'an installed listed model is used, not downloaded again');
  const macNoBrew = await localModelStep({ home: dir, platform: 'darwin', dirs: [], memoryBytes: 8 * 1024 ** 3, models: async () => [] });
  if (!macNoBrew.ollama) assert.equal(macNoBrew.download, 'https://ollama.com/download');
});

test('finish opens one Welcome chat with the Main agent\'s greeting and the first question\'s answers', async () => {
  const first = (await call('POST', '/api/first-run/finish')).json();
  assert.ok(first.conversationId);
  assert.deepEqual((await call('POST', '/api/first-run/finish')).json(), first, 'repeat returns the same chat');
  assert.equal((await call('GET', '/api/first-run')).json().pending, false);
  const [message] = await listConversationMessages(first.conversationId);
  assert.equal(message.role, 'assistant');
  assert.match(message.content, /Hi Mohamed/);
  assert.match(message.content, /Where do you want to talk to me\?/);
  assert.ok(JSON.stringify(message.parts).includes('Telegram'));
});

test('welcome text names the team in plain words', () => {
  assert.match(welcomeText('Mohamed', 'Sami', [{ name: 'Nora', department: 'marketing' }, { name: 'Omar', department: 'sales' }]), /\*\*Nora\*\* \(marketing\) and \*\*Omar\*\* \(sales\)/);
});
