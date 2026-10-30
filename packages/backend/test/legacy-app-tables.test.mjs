// APPS-06 step 3: an app that used to ship with Girru (seo) now comes from the Girru Store. Its old
// tables are renamed once to app_seo__<old name>, after a before-update backup (no backup, no rename),
// and it is marked to be added again; the add from the Store keeps the moved rows, clears the mark on
// success and keeps it on failure. A fresh data folder gets no seo tables; the program has no extensions/seo.
// No network: the Girru Store is a fake. Run: node --import tsx --test test/legacy-app-tables.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-legacy-app-tables-'));
const data = join(dir, '.data');
mkdirSync(join(data, 'multi-agent'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_DATA_DIR = data;
process.env.DATABASE_PATH = join(data, 'agent-player.db');
process.env.GIRRU_BACKUPS_DIR = join(dir, 'Girru Backups');
process.env.GIRRU_STORE_URL = 'https://store.test';
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
const quiet = () => {}; console.log = quiet; console.warn = quiet; console.error = quiet;

// The Store's seo package, cut down: the same tables under their Store names, IF NOT EXISTS only.
const sha = (b) => createHash('sha256').update(b).digest('hex');
const served = {
  'agentplayer.plugin.json': JSON.stringify({ id: 'seo', name: 'SEO', version: '1.1.0', main: 'index.js', permissions: ['database'] }),
  'index.js': 'export default { async register(api) {} };\n',
  'migrations/001_seo_core.sql': [
    'CREATE TABLE IF NOT EXISTS app_seo__seo_domains (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, domain TEXT NOT NULL);',
    'CREATE INDEX IF NOT EXISTS app_seo__idx_domains_user ON app_seo__seo_domains(user_id);',
    'CREATE TABLE IF NOT EXISTS app_seo__seo_keywords (id TEXT PRIMARY KEY, domain_id TEXT NOT NULL, keyword TEXT NOT NULL, FOREIGN KEY (domain_id) REFERENCES app_seo__seo_domains(id) ON DELETE CASCADE);',
    'CREATE INDEX IF NOT EXISTS app_seo__idx_keywords_domain ON app_seo__seo_keywords(domain_id);',
  ].join('\n'),
};
const list = Object.entries(served).map(([path, body]) => ({ path, sha256: sha(Buffer.from(body)), size: Buffer.byteLength(body) })).sort((a, b) => a.path.localeCompare(b.path));
const index = { schema: 1, featured: null, collections: [], items: [{ id: 'seo', kind: 'app', name: 'SEO', summary: 'Track your keyword rankings.', description: 'Keyword tracking.', icon: 'search', maker: 'Girru', version: '1.1.0', updated: '2026-10-30', category: 'marketing', permissions: ['Keeps its data in its own tables'], worksWith: [], languages: ['English'], pricing: { model: 'free' }, package: { files: list, sha256: sha(JSON.stringify(list)) } }] };
let storeUp = false;
globalThis.fetch = async (url) => {
  const u = String(url);
  const body = !storeUp ? undefined : u === 'https://store.test/index.json' ? JSON.stringify(index) : u.startsWith('https://store.test/apps/seo/package/') ? served[u.slice('https://store.test/apps/seo/package/'.length)] : undefined;
  if (body === undefined) return { ok: false, status: 503, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) };
  const bytes = Buffer.from(body);
  return { ok: true, status: 200, text: async () => body, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) };
};

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { moveLegacyAppTables, reinstallMovedApps, MOVED_APPS } = await import(join(backendDir, 'src/services/legacy-app-tables.ts'));
const { backUpNow } = await import(join(backendDir, 'src/services/backups.ts'));

const table = (t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
const indexes = (t) => db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL ORDER BY name").all(t).map((x) => x.name);
const setting = (k) => db.prepare('SELECT value FROM app_settings WHERE key = ?').get(k)?.value;
// The tables as the bundled seo extension made them (cut down), with its recorded migrations.
function oldSeo({ enabled = 1 } = {}) {
  db.exec(`CREATE TABLE seo_domains (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, domain TEXT NOT NULL);
    CREATE INDEX idx_seo_domains_user ON seo_domains(user_id);
    CREATE TABLE seo_keywords (id TEXT PRIMARY KEY, domain_id TEXT NOT NULL, keyword TEXT NOT NULL, FOREIGN KEY (domain_id) REFERENCES seo_domains(id) ON DELETE CASCADE);
    CREATE INDEX idx_seo_keywords_domain ON seo_keywords(domain_id);
    INSERT INTO seo_domains VALUES ('d-1', 'u-1', 'example.test');
    INSERT INTO seo_keywords VALUES ('k-1', 'd-1', 'first'), ('k-2', 'd-1', 'second');`);
  db.prepare("INSERT OR REPLACE INTO extension_configs (extension_id, enabled) VALUES ('seo', ?)").run(enabled);
  for (const f of ['001_seo_core.sql', '002_search_console.sql', '003_settings.sql']) db.prepare("INSERT INTO extension_migrations (extension_id, filename) VALUES ('seo', ?)").run(f);
}

test('a fresh data folder gets no seo tables, and the program ships no extensions/seo', async () => {
  assert.ok(!existsSync(join(backendDir, 'extensions', 'seo')), 'seo comes from the Girru Store now');
  assert.ok(MOVED_APPS.some((a) => a.id === 'seo'));
  let backedUp = false;
  assert.deepEqual(await moveLegacyAppTables({ backup: async () => { backedUp = true; } }), []);
  assert.equal(backedUp, false, 'nothing to move: no backup');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND (name LIKE 'seo%' OR name LIKE 'app_seo%')").get().n, 0);
  assert.ok(setting('store.moved.seo'), 'marked as done');
  assert.equal(setting('store.reinstall.seo'), undefined, 'nothing to add again');
  db.prepare("DELETE FROM app_settings WHERE key = 'store.moved.seo'").run(); // the next tests start from an older Girru
});

test('the backup fails: nothing is renamed, and the move is tried again at the next start', async () => {
  oldSeo({ enabled: 0 });
  assert.deepEqual(await moveLegacyAppTables({ backup: async () => { throw new Error('disk full'); } }), []);
  assert.ok(table('seo_domains') && table('seo_keywords'));
  assert.ok(!table('app_seo__seo_domains'));
  assert.equal(setting('store.moved.seo'), undefined);
  assert.equal(setting('store.reinstall.seo'), undefined);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM extension_migrations WHERE extension_id = 'seo'").get().n, 3, 'its migration records stay');
});

test('the move: a backup first, then the tables renamed with their rows, once; the app waits to be added again', async () => {
  let calls = 0;
  const moved = await moveLegacyAppTables({
    backup: async () => {
      calls++;
      assert.ok(table('seo_domains') && !table('app_seo__seo_domains'), 'the backup is made before anything is renamed');
      return backUpNow('before-update');
    },
  });
  assert.deepEqual(moved, ['seo']);
  assert.equal(calls, 1);
  assert.ok(readdirSync(join(dir, 'Girru Backups'), { recursive: true }).some((n) => String(n).endsWith('-before-update')), 'a before-update backup exists');
  assert.ok(!table('seo_domains') && !table('seo_keywords'));
  assert.deepEqual(db.prepare('SELECT keyword FROM app_seo__seo_keywords ORDER BY id').all().map((r) => r.keyword), ['first', 'second']);
  assert.match(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'app_seo__seo_keywords'").get().sql, /REFERENCES "?app_seo__seo_domains"?/, 'the foreign key follows the rename');
  assert.deepEqual(indexes('app_seo__seo_domains'), [], 'old index names go; the Store copy makes them again');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM extension_migrations WHERE extension_id = 'seo'").get().n, 0, 'the Store copy runs its own migrations');
  assert.equal(JSON.parse(setting('store.reinstall.seo')).enabled, false, 'it was off');
  assert.ok(setting('store.moved.seo'));
  // Never twice.
  assert.deepEqual(await moveLegacyAppTables({ backup: async () => { calls++; } }), []);
  assert.equal(calls, 1);
});

test('adding it again: the Store cannot be reached, the mark stays; then it is added with its data and the mark goes', async () => {
  storeUp = false;
  const failed = await reinstallMovedApps();
  assert.equal(failed.length, 1); assert.equal(failed[0].ok, false);
  assert.ok(setting('store.reinstall.seo'), 'kept for the next start');
  assert.ok(!existsSync(join(data, 'apps', 'seo')));

  storeUp = true;
  const done = await reinstallMovedApps();
  assert.equal(done.length, 1); assert.equal(done[0].ok, true, done[0].message);
  assert.equal(setting('store.reinstall.seo'), undefined, 'the mark is cleared');
  assert.ok(existsSync(join(data, 'apps', 'seo', 'index.js')), 'in the data folder');
  assert.equal(JSON.parse(setting('store.installed.seo')).version, '1.1.0');
  assert.deepEqual(db.prepare('SELECT keyword FROM app_seo__seo_keywords ORDER BY id').all().map((r) => r.keyword), ['first', 'second'], 'the moved rows stay');
  assert.deepEqual(indexes('app_seo__seo_domains'), ['app_seo__idx_domains_user']);
  assert.equal(db.prepare("SELECT enabled FROM extension_configs WHERE extension_id = 'seo'").get().enabled, 0, 'the owner had it off: it stays off');
  assert.deepEqual(await reinstallMovedApps(), [], 'nothing left to add');
});

// Any moved app: "had it" comes from extension_configs (on or off) or its recorded migrations,
// never from a table alone; an app with no tables moves with no backup; old views are dropped.
test('an app with no tables that the owner had is marked to be added again, on or off as it was, with no backup', async () => {
  db.prepare("INSERT OR REPLACE INTO extension_configs (extension_id, enabled) VALUES ('demo-on', 1), ('demo-off', 0)").run();
  db.exec('CREATE TABLE demo_shared (id TEXT PRIMARY KEY); INSERT INTO demo_shared VALUES (\'x\');'); // made for everyone by an old Girru
  let backedUp = 0;
  const apps = [{ id: 'demo-on', tables: [] }, { id: 'demo-off', tables: [] }, { id: 'demo-never', tables: ['demo_shared'] }];
  assert.deepEqual(await moveLegacyAppTables({ apps, backup: async () => { backedUp++; } }), ['demo-on', 'demo-off']);
  assert.equal(backedUp, 0, 'nothing renamed: no backup');
  assert.equal(JSON.parse(setting('store.reinstall.demo-on')).enabled, true);
  assert.equal(JSON.parse(setting('store.reinstall.demo-off')).enabled, false);
  assert.equal(setting('store.reinstall.demo-never'), undefined, 'never used: nothing to add again');
  assert.ok(table('demo_shared') && !table('app_demo_never__demo_shared'), 'a table alone does not mean the owner used the app');
  for (const id of ['demo-on', 'demo-off', 'demo-never']) assert.ok(setting(`store.moved.${id}`), id);
  assert.deepEqual(await moveLegacyAppTables({ apps, backup: async () => { backedUp++; } }), [], 'once');
  db.prepare("DELETE FROM app_settings WHERE key LIKE 'store.reinstall.demo-%'").run(); // nothing in the fake Store to add
});

test('old views over a moved app\'s tables are dropped before the rename; its rows move', async () => {
  db.exec(`CREATE TABLE demo_items (id TEXT PRIMARY KEY, n INTEGER);
    INSERT INTO demo_items VALUES ('a', 1), ('b', 2);
    CREATE VIEW v_demo_items AS SELECT COUNT(*) AS n FROM demo_items;`);
  db.prepare("INSERT INTO extension_migrations (extension_id, filename) VALUES ('demo-views', '001_demo.sql')").run();
  const apps = [{ id: 'demo-views', tables: ['demo_items'], views: ['v_demo_items'] }];
  assert.deepEqual(await moveLegacyAppTables({ apps, backup: async () => {} }), ['demo-views']);
  assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'view' AND name = 'v_demo_items'").get(), undefined);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM app_demo_views__demo_items').get().n, 2);
  assert.equal(JSON.parse(setting('store.reinstall.demo-views')).enabled, false, 'no config row: it was off');
  db.prepare("DELETE FROM app_settings WHERE key = 'store.reinstall.demo-views'").run();
});

// server-monitor has no tables: only its extension_configs row says the owner had it.
test('server-monitor: the program ships no extensions/server-monitor; an owner who had it (even turned off) gets it added again, off, with no backup', async () => {
  assert.ok(!existsSync(join(backendDir, 'extensions', 'server-monitor')), 'server-monitor comes from the Girru Store now');
  assert.ok(MOVED_APPS.some((a) => a.id === 'server-monitor' && a.tables.length === 0));
  db.prepare("DELETE FROM app_settings WHERE key = 'store.moved.server-monitor'").run(); // marked by the first test's start: start from an older Girru
  db.prepare("INSERT OR REPLACE INTO extension_configs (extension_id, enabled) VALUES ('server-monitor', 0)").run();
  let backedUp = 0;
  assert.deepEqual(await moveLegacyAppTables({ backup: async () => { backedUp++; } }), ['server-monitor']);
  assert.equal(backedUp, 0, 'nothing renamed: no backup');
  assert.equal(JSON.parse(setting('store.reinstall.server-monitor')).enabled, false);
  assert.deepEqual(await moveLegacyAppTables({ backup: async () => { backedUp++; } }), [], 'once');
  const tried = await reinstallMovedApps(); // this fake Store has no server-monitor: the mark waits for the next start
  assert.deepEqual(tried.map((t) => [t.id, t.ok]), [['server-monitor', false]]);
  assert.ok(setting('store.reinstall.server-monitor'));
});
