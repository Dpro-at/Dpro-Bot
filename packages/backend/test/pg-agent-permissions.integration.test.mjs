// CORE-PERMS-01: the per-agent permissions store on PostgreSQL.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
//
// The SQLite file (a temp file, never the real .data) is watched: any
// agent_permissions statement that reaches SQLite fails the last test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';
const sqliteHits = [];
const tag = randomBytes(4).toString('hex');

let m = {};
let dir;
let closeAll = async () => {};
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-perms-'));
  mkdirSync(join(dir, '.data'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir;
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;

  const quiet = { log: console.log, info: console.info };
  console.log = () => {}; console.info = () => {};
  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase({ path: process.env.DATABASE_PATH }).initialize();
  const mgr = getDatabase();
  for (const target of [mgr, mgr.getDb()]) {
    const original = target.prepare;
    target.prepare = function (sql) {
      if (/\bagent_permissions\b/i.test(String(sql))) sqliteHits.push(String(sql).replace(/\s+/g, ' ').slice(0, 120));
      return original.call(this, sql);
    };
  }
  const pool = await import('../src/db/pg/pool.ts');
  m = {
    q: (await import('../src/repositories/sql-steps.ts')).q,
    perms: await import('../src/tools/agent-permissions.ts'),
    agents: (await import('../src/repositories/index.ts')).repositories.agents,
    actor: (await import('../src/repositories/actor.ts')).userActor,
  };
  closeAll = async () => {
    Object.assign(console, quiet);
    await pool.closePgPool();
    closeDatabase();
  };
}

test('new agent seeded Careful; save, conflict and fail-closed reads on PostgreSQL', { skip }, async () => {
  const { q, perms, agents, actor } = m;
  const created = await agents.createConfig(actor({ id: `pg-owner-${tag}`, role: 'owner' }), { name: `Perm ${tag}`, role: 'specialist' });
  const seeded = await perms.loadAgentPermissions(created.id);
  assert.equal(seeded.version, 1);
  assert.equal(seeded.modes.network, 'ask');
  assert.equal(seeded.modes.money, 'off');
  assert.deepEqual(seeded.memoryRead, ['project', 'task']);
  assert.deepEqual(seeded.memoryWrite, []);
  await q.run(`INSERT INTO agents_config (id, name) VALUES (?, ?)`, `old-${tag}`, `Old ${tag}`);
  assert.equal((await perms.loadAgentPermissions(`old-${tag}`)).modes.browser, 'allow', 'no row: earlier behaviour');
  const input = { memoryRead: ['task', 'owner'], memoryWrite: ['task'], sharedMemory: true, modes: { ...seeded.modes, browser: 'off' } };
  const { after } = await perms.setAgentPermissions(created.id, input, 1, 'pg-owner');
  assert.deepEqual([after.version, after.modes.browser, after.sharedMemory], [2, 'off', true]);
  assert.deepEqual(after.memoryRead, ['owner', 'task']);
  await assert.rejects(perms.setAgentPermissions(created.id, input, 1, 'pg-owner'), perms.PermissionsConflictError);
  assert.equal((await perms.setAgentPermissions(`old-${tag}`, input, 0, 'pg-owner')).after.version, 1);
  await q.run(`UPDATE agent_permissions SET modes = '{broken' WHERE agent_id = ?`, created.id);
  assert.equal((await perms.loadAgentPermissions(created.id)).modes.money, 'ask', 'a broken row reads as ask, never allow');
});

test('no agent_permissions statement reached SQLite', { skip }, () => {
  assert.deepEqual(sqliteHits, []);
});

test.after(async () => {
  await closeAll();
  if (dir) {
    process.chdir('/');
    rmSync(dir, { recursive: true, force: true });
  }
});
