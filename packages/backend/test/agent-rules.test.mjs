// RULES-01: Agents › Rules — the owner's rules for how agents work.
//  - where (everywhere / one project) and who (all / departments / chosen agents) decide who gets a rule;
//  - order: everywhere, then the project, then chosen agents (the later one wins); paused rules are never sent;
//  - edits keep versions, Delete has Undo, agents only suggest (the owner accepts or dismisses);
//  - owner only; the effective list reaches the agent's instructions.
// Throwaway DB/keys; no network.
// Run: node --import tsx --test test/agent-rules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-agent-rules-'));
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
const quiet = () => {}; console.log = quiet; console.info = quiet; console.warn = quiet;

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
for (const [id, role] of [['r-owner', 'owner'], ['r-user', 'user']]) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`).run(id, `${id}@example.test`, id, role);
}
db.prepare(`INSERT INTO agents_config (id, name, provider, model, is_primary, department) VALUES ('a-lead', 'Lead', 'ollama', 'qwen-test', 1, NULL), ('a-dev', 'Dev', 'ollama', 'qwen-test', 0, 'development'), ('a-qa', 'QA', 'ollama', 'qwen-test', 0, 'research')`).run();
db.prepare(`INSERT INTO chat_projects (id, user_id, name, slug) VALUES ('p-dpro', 'r-owner', 'Dpro', 'dpro'), ('p-other', 'r-owner', 'Other', 'other')`).run();
db.prepare(`INSERT INTO chat_sessions (id, user_id, title, model, project_id) VALUES ('s-dpro', 'r-owner', 'In Dpro', 'qwen-test', 'p-dpro')`).run();

const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const rules = await import(join(backendDir, 'src/services/agent-rules.ts'));
const { subscriptionAgentContext } = await import(join(backendDir, 'src/services/subscription-agent-context.ts'));
const { ruleSuggestTool } = await import(join(backendDir, 'src/tools/rules/rule-suggest.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const call = (user, method, url, payload) => app.inject({ method, url, headers: { authorization: `Bearer ${generateToken(user, 1)}` }, ...(payload ? { payload } : {}) });
const texts = (list) => list.map((r) => r.text);

test('where and who decide who gets a rule; the order is everywhere, project, chosen agents; paused rules are left out', async () => {
  const add = async (body) => { const r = await call('r-owner', 'POST', '/api/agent-rules', body); assert.equal(r.statusCode, 201, r.body); return r.json().rule; };
  await add({ text: 'Agent rule for QA', who: 'agents', targets: ['a-qa'] });
  await add({ text: 'Everywhere for all' });
  await add({ text: 'Dpro for development', projectId: 'p-dpro', who: 'departments', targets: ['Development'] });
  await add({ text: 'Other project only', projectId: 'p-other' });
  const paused = await add({ text: 'Paused everywhere', paused: true });
  assert.equal(paused.paused, true);
  const eff = async (agentId, projectId) => texts((await call('r-owner', 'GET', `/api/agent-rules/effective?agentId=${agentId}${projectId ? `&projectId=${projectId}` : ''}`)).json().rules);
  assert.deepEqual(await eff('a-dev', 'p-dpro'), ['Everywhere for all', 'Dpro for development']);
  assert.deepEqual(await eff('a-qa', 'p-dpro'), ['Everywhere for all', 'Agent rule for QA'], 'the rule for one agent comes last, so it wins');
  assert.deepEqual(await eff('a-dev', null), ['Everywhere for all'], 'a project rule stays in its project');
  assert.deepEqual(await eff('a-lead', 'p-other'), ['Everywhere for all', 'Other project only']);
  const page = (await call('r-owner', 'GET', '/api/agent-rules')).json();
  assert.equal(page.rules.length, 5);
  assert.deepEqual(page.departments, ['development', 'research']);
  assert.equal(page.rules.find((r) => r.text === 'Dpro for development').targets[0], 'development', 'departments are kept lowercase');
});

test('the effective list reaches the agent instructions (by the chat\'s project), with the order explained', async () => {
  const text = await subscriptionAgentContext('a-dev', { sessionId: 's-dpro' });
  assert.match(text, /## Owner rules\nThe owner set these rules[^\n]*later one wins[^\n]*\n1\. Everywhere for all\n2\. Dpro for development\n/);
  assert.doesNotMatch(text, /Paused everywhere|Other project only|Agent rule for QA/);
  assert.equal(await rules.rulesContext('a-lead', { projectId: 'p-dpro' }).then((t) => t.includes('Dpro for development')), false, 'not in that department');
});

test('an edit keeps the earlier version and can be put back; Delete has Undo and stops the rule at once', async () => {
  const rule = (await call('r-owner', 'POST', '/api/agent-rules', { text: 'First words' })).json().rule;
  const edited = (await call('r-owner', 'PUT', `/api/agent-rules/${rule.id}`, { text: 'Second words' })).json().rule;
  assert.equal(edited.version, 2);
  assert.equal((await call('r-owner', 'PUT', `/api/agent-rules/${rule.id}`, { paused: true })).json().rule.version, 2, 'pausing is not a new version');
  const versions = (await call('r-owner', 'GET', `/api/agent-rules/${rule.id}/versions`)).json().versions;
  assert.deepEqual(versions.map((v) => [v.version, v.text]), [[1, 'First words']]);
  assert.equal((await call('r-owner', 'POST', `/api/agent-rules/${rule.id}/versions/1/restore`)).json().rule.text, 'First words');
  await call('r-owner', 'PUT', `/api/agent-rules/${rule.id}`, { paused: false });
  assert.equal((await call('r-owner', 'POST', `/api/agent-rules/${rule.id}/delete`)).json().ok, true);
  assert.ok(!texts(await rules.effectiveRules('a-lead', null)).includes('First words'), 'a deleted rule is not sent');
  assert.equal((await call('r-owner', 'POST', `/api/agent-rules/${rule.id}/undo-delete`)).json().rule.text, 'First words');
  assert.ok(texts(await rules.effectiveRules('a-lead', null)).includes('First words'));
});

test('an agent only suggests: the suggestion waits, is never sent, and the owner accepts (after a change) or dismisses it', async () => {
  const out = await ruleSuggestTool.execute({ text: 'Read the README first', reason: 'I missed the steps', this_project: true }, { agentId: 'a-qa', sessionId: 's-dpro' });
  assert.match(out.content[0].text, /waits for the owner/);
  const page = (await call('r-owner', 'GET', '/api/agent-rules')).json();
  const s = page.suggestions.find((x) => x.text === 'Read the README first');
  assert.deepEqual([s.status, s.source, s.suggestedBy, s.reason, s.projectId], ['suggested', 'agent', 'a-qa', 'I missed the steps', 'p-dpro']);
  assert.ok(!texts(await rules.effectiveRules('a-qa', 'p-dpro')).includes('Read the README first'), 'a suggestion is not a rule');
  assert.equal((await call('r-owner', 'PUT', `/api/agent-rules/${s.id}`, { text: 'Read the project README before the first change' })).statusCode, 200, 'Change… edits it before it is used');
  assert.equal((await call('r-owner', 'POST', `/api/agent-rules/${s.id}/accept`)).json().rule.status, 'active');
  assert.ok(texts(await rules.effectiveRules('a-qa', 'p-dpro')).includes('Read the project README before the first change'));
  const again = await ruleSuggestTool.execute({ text: 'Read the project README before the first change' }, { agentId: 'a-qa', sessionId: 's-dpro' });
  assert.match(again.content[0].text, /already exists/);
  const other = (await call('r-owner', 'POST', '/api/agent-rules/suggestions', { text: 'Say hello', reason: 'over MCP' })).json().rule;
  assert.equal((await call('r-owner', 'POST', `/api/agent-rules/${other.id}/dismiss`)).json().rule.status, 'dismissed');
  assert.equal((await ruleSuggestTool.execute({ text: 'x', this_project: true }, { agentId: 'a-qa', sessionId: 'no-such' })).error?.includes('no project'), true);
});

test('our usual rules are added paused, once; bad input and other users are refused', async () => {
  const first = (await call('r-owner', 'POST', '/api/agent-rules/starter')).json().added;
  assert.equal(first.length, rules.STARTER_RULES.length);
  assert.ok(first.every((r) => r.paused));
  assert.equal((await call('r-owner', 'POST', '/api/agent-rules/starter')).json().added.length, 0, 'never twice');
  for (const body of [{ text: '' }, { text: 'x', who: 'departments' }, { text: 'x', projectId: 'missing' }, { text: 'x', extra: 1 }, { text: 'x', who: 'agents', targets: [] }]) {
    const r = await call('r-owner', 'POST', '/api/agent-rules', body);
    assert.equal(r.statusCode, 400, JSON.stringify(body));
    assert.equal(r.json().code, 'invalid_rule');
  }
  for (const [method, url] of [['GET', '/api/agent-rules'], ['POST', '/api/agent-rules'], ['GET', '/api/agent-rules/effective?agentId=a-dev']]) {
    assert.equal((await call('r-user', method, url, method === 'POST' ? { text: 'x' } : undefined)).statusCode, 403, `${method} ${url}`);
  }
  assert.equal((await app.inject({ method: 'GET', url: '/api/agent-rules' })).statusCode, 401);
});
