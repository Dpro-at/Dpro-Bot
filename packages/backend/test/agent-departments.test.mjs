// Settings › Departments: rename a department (every agent in it moves). Throwaway DB, test-only secrets, no network.
// Run: node --import tsx --test test/agent-departments.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-departments-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_DATA_DIR = join(dir, '.data');
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {}; console.warn = () => {}; console.info = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('dp-owner', 'owner');
addUser('dp-admin', 'admin');
addUser('dp-user', 'user');
const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { agentsConfigRoutes } = await import(join(backendDir, 'src/api/routes/agents-config.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const app = Fastify();
registerAuthGate(app);
await app.register(agentsConfigRoutes);
await app.ready();
console.log = quiet.log; console.warn = quiet.warn; console.info = quiet.info;
test.after(async () => { await app.close(); closeDatabase(); rmSync(dir, { recursive: true, force: true }); });
const call = (method, url, who, payload) => app.inject({ method, url, headers: who ? { authorization: `Bearer ${generateToken(who, 1)}` } : {}, ...(payload === undefined ? {} : { payload }) });

test('rename a department: owner only, every agent in it moves and its version moves on', async () => {
  const made = [];
  for (const [name, department] of [['Fictional Ada', 'research'], ['Fictional Bo', 'research'], ['Fictional Cy', 'sales']]) {
    const r = await call('POST', '/api/agents', 'dp-owner', { name, department });
    assert.equal(r.statusCode, 201, r.body);
    made.push(r.json().agent);
  }
  const url = '/api/agents/departments/rename';
  assert.equal((await call('POST', url, undefined, { from: 'research', to: 'science' })).statusCode, 401);
  assert.equal((await call('POST', url, 'dp-user', { from: 'research', to: 'science' })).statusCode, 403);
  assert.equal((await call('POST', url, 'dp-admin', { from: 'research', to: 'science' })).statusCode, 403);
  for (const bad of [{}, { from: 'research' }, { from: 'research', to: '' }, { from: 'research', to: 'x'.repeat(65) }, { from: 'research', to: 'a', extra: 1 }, []])
    assert.equal((await call('POST', url, 'dp-owner', bad)).statusCode, 400, JSON.stringify(bad));
  assert.equal((await call('POST', url, 'dp-owner', { from: 'nobody here', to: 'science' })).statusCode, 404);
  const r = await call('POST', url, 'dp-owner', { from: ' Research ', to: 'Science  Lab' });
  assert.equal(r.statusCode, 200, r.body);
  assert.deepEqual(r.json(), { from: 'research', to: 'science lab', moved: 2 });
  const after = (await call('GET', '/api/agents', 'dp-owner')).json().agents;
  for (const a of made.slice(0, 2)) { const now = after.find(x => x.id === a.id); assert.equal(now.department, 'science lab'); assert.ok(now.version > a.version); }
  assert.equal(after.find(x => x.id === made[2].id).department, 'sales');
  assert.equal(after.find(x => x.id === made[2].id).version, made[2].version);
});
