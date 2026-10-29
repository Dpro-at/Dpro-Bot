// BACKUP-01: automatic backup of the whole data folder — SQLite online backup with an
// integrity check (gzip'd), unchanged files linked to the last backup, kept outside the
// data folder, retention (14 days + 4 Sundays, before-update 30 days), the daily job,
// restore on the next start with an undo backup. Owner only.
// Throwaway DB/keys/folders; no network.
// Run: node --import tsx --test test/backups.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-backups-'));
const data = join(dir, '.data');
const outside = join(dir, 'Girru Backups');
mkdirSync(join(data, 'multi-agent'), { recursive: true });
mkdirSync(join(data, 'encryption'), { recursive: true });
mkdirSync(join(data, 'agents', 'g-lead'), { recursive: true });
mkdirSync(join(data, 'logs'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_CONFIG_DIR = join(dir, 'cli-config');
process.env.AGENT_PLAYER_DATA_DIR = data;
process.env.DATABASE_PATH = join(data, 'agent-player.db');
process.env.GIRRU_BACKUPS_DIR = outside;
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };
const quiet = () => {}; console.log = quiet; console.info = quiet; console.warn = quiet;

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
for (const [id, role] of [['b-owner', 'owner'], ['b-user', 'user']]) {
  db.prepare(`INSERT INTO users (id, email, username, full_name, password_hash, role, status, email_verified) VALUES (?, ?, ?, ?, 'x', ?, 'active', 1)`).run(id, `${id}@example.test`, id, id, role);
}
// Other stores of the data folder: keys and audit (SQLite, WAL), plain files.
for (const f of ['encryption/keys.db', 'audit/audit.db']) {
  mkdirSync(join(data, f, '..'), { recursive: true });
  const s = new Database(join(data, f)); s.pragma('journal_mode = WAL'); s.exec('CREATE TABLE t (v TEXT)'); s.prepare('INSERT INTO t VALUES (?)').run(f); s.close();
}
writeFileSync(join(data, 'agents', 'g-lead', 'rules.md'), 'be kind\n');
writeFileSync(join(data, 'secrets.env'), 'JWT_SECRET=throwaway\n');
writeFileSync(join(data, 'logs', 'backend.log'), 'not saved\n');

const B = await import(join(backendDir, 'src/services/backups.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const call = (user, method, url, payload) => app.inject({ method, url, headers: { authorization: `Bearer ${generateToken(user, 1)}` }, ...(payload ? { payload } : {}) });
const ok = async (r, code = 200) => { const x = await r; assert.equal(x.statusCode, code, x.body); return x.json(); };
const manifest = (id) => JSON.parse(readFileSync(join(B.workspaceBackupsDir(), id, 'manifest.json'), 'utf8'));
const at = (s) => new Date(s);

test('a backup copies the whole data folder outside it, checked, owner-only', async () => {
  const first = (await ok(call('b-owner', 'POST', '/api/backups', {}))).backup;
  assert.equal(first.kind, 'manual');
  assert.equal(first.checked, true);
  assert.deepEqual(first.parts, { data: true, audit: true, keys: true });
  const base = B.workspaceBackupsDir();
  assert.ok(base.startsWith(outside), 'kept outside the data folder');
  assert.equal(statSync(join(base, first.id)).mode & 0o777, 0o700);
  const m = manifest(first.id);
  const paths = m.entries.map((e) => e.path);
  for (const p of ['agent-player.db', join('encryption', 'keys.db'), join('audit', 'audit.db'), join('agents', 'g-lead', 'rules.md'), 'secrets.env']) assert.ok(paths.includes(p), p);
  assert.ok(!paths.some((p) => p.startsWith('logs')), 'logs are not saved');
  assert.ok(!paths.some((p) => /-(wal|shm)$/.test(p)), 'no SQLite side files');
  for (const e of m.entries.filter((x) => x.type === 'sqlite')) assert.equal(e.check, 'ok', e.path);
  // The stored keys DB is gzip'd, not the plain file.
  const gz = readFileSync(join(base, first.id, 'data', 'encryption', 'keys.db'));
  assert.equal(gz[0], 0x1f); assert.equal(gz[1], 0x8b);

  // Not changed since the last backup: a link, nothing new stored.
  await new Promise((r) => setTimeout(r, 1100));
  const second = (await ok(call('b-owner', 'POST', '/api/backups', { kind: 'before-update' }))).backup;
  const rules = manifest(second.id).entries.find((e) => e.path === join('agents', 'g-lead', 'rules.md'));
  assert.equal(rules.stored, 0);
  assert.equal(statSync(join(base, second.id, 'data', 'agents', 'g-lead', 'rules.md')).nlink, 2);

  const status = await ok(call('b-owner', 'GET', '/api/backups'));
  assert.equal(status.backups.length, 2);
  assert.equal(status.last.id, second.id);
  assert.equal(status.runsAt, '03:00');
  assert.equal(status.lastError, null);

  // Only the owner, and only known kinds.
  assert.equal((await call('b-user', 'GET', '/api/backups')).statusCode, 403);
  assert.equal((await call('b-user', 'POST', '/api/backups', {})).statusCode, 403);
  assert.equal((await call('b-owner', 'POST', '/api/backups', { kind: 'daily' })).statusCode, 400);
  assert.equal((await call('b-owner', 'POST', '/api/backups/../../x/restore')).statusCode, 404);
  assert.equal((await call('b-owner', 'DELETE', '/api/backups/20260101-000000-manual')).statusCode, 404);
});

test('the folder must be outside every data folder; cloud folders are flagged', async () => {
  for (const folder of ['relative/path', '/', join(data, 'backups'), data, dir]) {
    assert.equal((await call('b-owner', 'PUT', '/api/backups/folder', { folder })).statusCode, 400, folder);
  }
  const cloud = await ok(call('b-owner', 'PUT', '/api/backups/folder', { folder: join(tmpdir(), `ap-bk-${process.pid}`, 'Library', 'Mobile Documents', 'Girru') }));
  assert.equal(cloud.cloud, true);
  const back = await ok(call('b-owner', 'PUT', '/api/backups/folder', { folder: outside }));
  assert.equal(back.cloud, false);
  assert.equal(B.backupsFolder(), outside);
});

test('agent file and command tools cannot reach the backups folder', async () => {
  const { protectedDataDirs } = await import(join(backendDir, 'src/config/data-root.ts'));
  assert.ok(protectedDataDirs().some((d) => d === outside || d.endsWith('Girru Backups')), 'the backups folder is protected data');
});

test('retention keeps 14 days, 4 Sundays, before-update 30 days, and the newest', () => {
  const now = at('2026-10-29T12:00:00');
  const list = [];
  for (let d = 0; d < 70; d++) {
    const t = new Date(now.getTime() - d * 86_400_000); t.setHours(3, 0, 0, 0);
    list.push({ id: `d${d}`, at: t.toISOString(), kind: 'daily' });
  }
  list.push({ id: 'u10', at: at('2026-10-19T18:00:00').toISOString(), kind: 'before-update' });
  list.push({ id: 'u40', at: at('2026-09-19T18:00:00').toISOString(), kind: 'before-update' });
  const gone = new Set(B.expiredBackups(list, now));
  for (let d = 0; d <= 13; d++) assert.ok(!gone.has(`d${d}`), `day ${d} kept`);
  const keptOld = list.filter((b) => b.kind === 'daily' && !gone.has(b.id) && Number(b.id.slice(1)) > 14);
  assert.equal(keptOld.length, 4);
  assert.ok(keptOld.every((b) => new Date(b.at).getDay() === 0), 'the older ones kept are Sundays');
  assert.ok(!gone.has('u10'));
  assert.ok(gone.has('u40'));
  assert.deepEqual(B.expiredBackups([{ id: 'only', at: at('2025-01-01T03:00:00').toISOString(), kind: 'daily' }], now), [], 'the newest always stays');
});

test('the daily job runs once after 03:00, catching up after sleep', async () => {
  assert.equal(B.nextDaily(at('2026-10-29T09:00:00'), null).getTime(), at('2026-10-29T09:00:00').getTime(), 'none yet: now');
  assert.equal(B.nextDaily(at('2026-10-29T09:00:00'), at('2026-10-29T03:00:05').toISOString()).getTime(), at('2026-10-30T03:00:00').getTime());
  assert.equal(B.nextDaily(at('2026-10-29T02:00:00'), at('2026-10-28T03:00:05').toISOString()).getTime(), at('2026-10-29T03:00:00').getTime(), 'before 03:00: yesterday counts');
  assert.ok(B.nextDaily(at('2026-10-29T09:00:00'), at('2026-10-28T03:00:05').toISOString()) <= at('2026-10-29T09:00:00'), 'asleep at 03:00: runs on waking');
  const later = new Date(Date.now() + 2 * 86_400_000); later.setHours(9, 0, 0, 0);
  assert.equal(await B.runDueBackup(later), true);
  const daily = (await ok(call('b-owner', 'GET', '/api/backups'))).backups.filter((b) => b.kind === 'daily');
  assert.equal(daily.length, 1);
  assert.equal(await B.runDueBackup(new Date(later.getTime() + 3_600_000)), false, 'not twice the same day');
});

test('restore: backs up first, then on the next start puts the backup in place', async () => {
  const target = (await ok(call('b-owner', 'POST', '/api/backups', {}))).backup;
  db.prepare(`INSERT INTO users (id, email, username, full_name, password_hash, role, status, email_verified) VALUES ('b-late', 'late@example.test', 'late', 'late', 'x', 'user', 'active', 1)`).run();
  writeFileSync(join(data, 'agents', 'g-lead', 'new.md'), 'made after\n');
  const before = (await ok(call('b-owner', 'GET', '/api/backups'))).backups.length;
  const asked = await ok(call('b-owner', 'POST', `/api/backups/${target.id}/restore`));
  assert.equal(asked.restarting, false, 'no restart handler in tests');
  assert.match(asked.undoId, /before-restore$/);
  assert.equal((await ok(call('b-owner', 'GET', '/api/backups'))).backups.length, before + 1, 'the undo backup');
  assert.ok(existsSync(join(data, B.RESTORE_MARKER)));

  await app.close();
  db.close();
  const done = await B.applyPendingRestore();
  assert.deepEqual(done, { id: target.id, ok: true });
  assert.ok(!existsSync(join(data, B.RESTORE_MARKER)), 'the marker goes first');
  const check = new Database(join(data, 'agent-player.db'), { readonly: true });
  assert.equal(check.prepare("SELECT COUNT(*) AS n FROM users WHERE id = 'b-late'").get().n, 0);
  assert.equal(check.prepare("SELECT COUNT(*) AS n FROM users WHERE id = 'b-owner'").get().n, 1);
  check.close();
  assert.ok(!existsSync(join(data, 'agents', 'g-lead', 'new.md')), 'files made after leave');
  assert.ok(existsSync(join(data, 'agents', 'g-lead', 'rules.md')));
  assert.ok(existsSync(join(data, 'secrets.env')), 'configuration stays');
  assert.equal(new Database(join(data, 'encryption', 'keys.db'), { readonly: true }).prepare('SELECT v FROM t').get().v, 'encryption/keys.db');
  assert.equal(B.backupStatus().lastRestore.ok, true);

  // A marker that points anywhere else is refused (and removed).
  writeFileSync(join(data, B.RESTORE_MARKER), JSON.stringify({ id: target.id, folder: '/tmp/elsewhere' }));
  assert.equal((await B.applyPendingRestore()).ok, false);
  assert.ok(!existsSync(join(data, B.RESTORE_MARKER)));
  assert.equal(await B.applyPendingRestore(), null, 'nothing asked: nothing done');
  assert.ok(readdirSync(B.workspaceBackupsDir()).length >= 3);
});
