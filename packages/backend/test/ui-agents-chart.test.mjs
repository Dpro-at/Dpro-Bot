// Agents chart choices per person. Throwaway DB, test-only secrets, no network.
// Run: node --import tsx --test test/ui-agents-chart.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chart-prefs-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
const quiet = { log: console.log, warn: console.warn };
console.log = () => {}; console.warn = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase(); await db.initialize();
for (const [id, role] of [['cp-owner', 'owner'], ['cp-user', 'user']]) db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { uiAgentsChartRoutes } = await import(join(backendDir, 'src/api/routes/ui-agents-chart.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const app = Fastify(); registerAuthGate(app); await app.register(uiAgentsChartRoutes); await app.ready();
console.log = quiet.log; console.warn = quiet.warn;
test.after(async () => { await app.close(); closeDatabase(); rmSync(dir, { recursive: true, force: true }); });
const call = (method, who, payload) => app.inject({ method, url: '/api/me/agents-chart', headers: who ? { authorization: `Bearer ${generateToken(who, 1)}` } : {}, ...(payload === undefined ? {} : { payload }) });

test('chart choices are kept per person and only known values pass', async () => {
  assert.equal((await call('GET')).statusCode, 401);
  assert.deepEqual((await call('GET', 'cp-owner')).json().chart, { view: 'list', mode: 'reports', lines: 'elbow', zoom: 1, folded: [] });
  const r = await call('PUT', 'cp-owner', { view: 'chart', mode: 'departments', lines: 'curved', zoom: 0.8, folded: ['agent-1'] });
  assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(r.json().chart, { view: 'chart', mode: 'departments', lines: 'curved', zoom: 0.8, folded: ['agent-1'] });
  assert.equal((await call('PUT', 'cp-owner', { zoom: 0.9 })).json().chart.lines, 'curved', 'a change keeps the rest');
  assert.equal((await call('GET', 'cp-user')).json().chart.view, 'list', 'another person has their own');
  for (const bad of [{}, { view: 'grid' }, { zoom: 5 }, { lines: 'wavy' }, { folded: ['../x'] }, { extra: 1 }, []]) assert.equal((await call('PUT', 'cp-owner', bad)).statusCode, 400, JSON.stringify(bad));
});
