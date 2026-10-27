// CH8 Results colours: the branch's pull request read from a fake GitHub — owner only, read-only,
// the stored key never leaves the backend, cached a minute, quiet when GitHub cannot be asked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chat-pr-'));
mkdirSync(join(dir, '.data', 'multi-agent'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_CONFIG_DIR = join(dir, 'cli-config');
process.env.AGENT_PLAYER_DATA_DIR = join(dir, '.data');
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };
const capture = () => {};
console.log = capture; console.info = capture; console.warn = capture; console.error = capture;

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getCredentialManager } = await import(join(backendDir, 'src/credentials/manager.ts'));
const { CredentialType } = await import(join(backendDir, 'src/credentials/types.ts'));
const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
await getOrchestrator().initialize(join(dir, '.data', 'multi-agent', 'orchestrator.db'));
for (const [id, role] of [['p-owner', 'owner'], ['p-other', 'user']]) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`).run(id, `${id}@example.test`, id, role);
}
const pr = await import(join(backendDir, 'src/services/github-pr-state.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const call = (user, method, url, payload) => app.inject({ method, url, headers: { authorization: `Bearer ${generateToken(user, 1)}` }, ...(payload ? { payload } : {}) });

// A project folder on branch feature/colours of github.com/acme/widgets.
const repo = join(dir, 'work', 'widgets');
mkdirSync(repo, { recursive: true });
const g = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'ignore' });
g('init', '-q'); g('config', 'user.email', 't@example.test'); g('config', 'user.name', 't');
writeFileSync(join(repo, 'a.txt'), '1'); g('add', '.'); g('commit', '-qm', 'x'); g('checkout', '-q', '-b', 'feature/colours');
g('remote', 'add', 'origin', 'https://github.com/acme/widgets.git');
const project = (await call('p-owner', 'POST', '/api/chat/projects', { name: 'Widgets', folder: repo })).json().project;

const SHA = 'a'.repeat(40);
let now = 1_000_000;
let calls = [];
let answer = {};
const fake = async (url, init) => {
  calls.push({ url, auth: init.headers.Authorization ?? null });
  const u = new URL(url);
  assert.equal(u.origin, 'https://api.github.com', 'only GitHub’s API');
  const reply = Object.entries(answer).find(([path]) => u.pathname.endsWith(path))?.[1];
  if (reply instanceof Error) throw reply;
  if (typeof reply === 'number') return { ok: false, status: reply, json: async () => ({}) };
  return { ok: true, status: 200, url: answer.finalUrl ?? url, json: async () => reply ?? {} };
};
const pull = (over = {}) => ({ number: 38, title: 'Chat review fixes', state: 'open', draft: false, merged_at: null, html_url: 'https://github.com/acme/widgets/pull/38', head: { ref: 'feature/colours', sha: SHA }, ...over });
const reset = (a) => { answer = a; calls = []; pr.setGitHubForTests(fake, () => now); };
const get = async (user = 'p-owner') => call(user, 'GET', `/api/chat/projects/${project.id}/pr`);

test('owner only: another user gets nothing and GitHub is never asked', async () => {
  reset({ '/pulls': [pull()] });
  assert.notEqual((await get('p-other')).statusCode, 200);
  assert.equal(calls.length, 0);
});

test('open, merged, closed and draft come from the branch’s latest pull request, with a checks summary', async () => {
  for (const [over, state] of [[{}, 'open'], [{ state: 'closed', merged_at: '2026-10-27T00:00:00Z' }, 'merged'], [{ state: 'closed' }, 'closed'], [{ draft: true }, 'draft']]) {
    reset({ '/pulls': [pull(over)], '/check-runs': { check_runs: [{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'skipped' }] }, '/status': { statuses: [] } });
    const r = await get();
    assert.equal(r.statusCode, 200);
    assert.deepEqual(r.json(), { pr: { number: 38, title: 'Chat review fixes', state, url: 'https://github.com/acme/widgets/pull/38', checks: 'passing' } });
  }
  const pulls = new URL(calls.find((c) => c.url.includes('/pulls')).url);
  assert.equal(pulls.pathname, '/repos/acme/widgets/pulls');
  assert.equal(pulls.searchParams.get('head'), 'acme:feature/colours', 'only this project’s repo and branch');
});

test('checks: a failure wins, then anything still running; none means no dot', async () => {
  const runs = (list, statuses = []) => ({ '/pulls': [pull()], '/check-runs': { check_runs: list }, '/status': { statuses } });
  for (const [a, want] of [
    [runs([{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'failure' }]), 'failing'],
    [runs([{ status: 'in_progress', conclusion: null }]), 'pending'],
    [runs([{ status: 'completed', conclusion: 'success' }], [{ state: 'error' }]), 'failing'],
    [runs([], [{ state: 'pending' }]), 'pending'],
    [runs([]), null],
  ]) { reset(a); assert.equal((await get()).json().pr.checks, want); }
});

test('a branch without a pull request, a pull request of another repo and an unknown remote', async () => {
  reset({ '/pulls': [] });
  assert.deepEqual((await get()).json(), { pr: null });
  reset({ '/pulls': [pull({ html_url: 'https://evil.example/acme/widgets/pull/38' })] });
  assert.deepEqual((await get()).json(), { pr: null, unavailable: true });
  reset({ '/pulls': [pull({ html_url: 'https://github.com/acme/gadgets/pull/38' })] });
  assert.equal((await get()).json().pr.url, 'https://github.com/acme/gadgets/pull/38', 'a renamed repository links under its new name');
  reset({ '/pulls': [pull()], finalUrl: 'https://evil.example/repos/acme/widgets/pulls' });
  assert.deepEqual((await get()).json(), { pr: null, unavailable: true }, 'a redirect away from GitHub’s API is refused');
  reset({ '/pulls': [pull({ head: { ref: 'other', sha: SHA } })] });
  assert.deepEqual((await get()).json(), { pr: null });
  reset({ '/pulls': [pull()] });
  assert.deepEqual(await pr.projectPullRequest('p-owner', { branch: 'main', remote: 'https://gitlab.com/acme/widgets.git' }), { pr: null });
  assert.equal(calls.length, 0, 'not on GitHub: nothing is asked');
});

test('offline or rate limited is a quiet "unavailable", kept a minute like every answer', async () => {
  reset({ '/pulls': 403 });
  assert.deepEqual((await get()).json(), { pr: null, unavailable: true });
  answer = { '/pulls': [pull()] };
  assert.deepEqual((await get()).json(), { pr: null, unavailable: true }, 'still cached');
  assert.equal(calls.length, 1);
  now += pr.PR_CACHE_MS + 1;
  assert.equal((await get()).json().pr.state, 'open', 'asked again after a minute');
  reset({ '/pulls': new Error('ENOTFOUND api.github.com') });
  assert.deepEqual((await get()).json(), { pr: null, unavailable: true });
});

test('the stored github key is sent only to GitHub and never comes back to the window', async () => {
  reset({ '/pulls': [pull()] });
  await get();
  assert.ok(calls.every((c) => c.auth === null), 'no key stored: asked without one');
  const key = `ghp_${'k'.repeat(36)}`;
  await getCredentialManager().create({ name: 'api_token', type: CredentialType.API_KEY, value: key, skillId: 'github', userId: 'p-owner' });
  reset({ '/pulls': [pull()], '/check-runs': { check_runs: [] }, '/status': { statuses: [] } });
  const r = await get();
  assert.ok(calls.length >= 1 && calls.every((c) => c.auth === `Bearer ${key}`));
  assert.ok(!r.body.includes(key), 'the key is not in the answer');
});
