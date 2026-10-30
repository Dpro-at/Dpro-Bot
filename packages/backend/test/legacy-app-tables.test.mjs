// APPS-06 step 3: apps that used to ship with Girru (seo, waf-security) now come from the Girru Store. Its old
// tables are renamed once to app_seo__<old name>, after a before-update backup (no backup, no rename),
// and it is marked to be added again; the add from the Store keeps the moved rows, clears the mark on
// success and keeps it on failure. A fresh data folder gets no seo tables; the program has no extensions/seo.
// waf-security: its waf_scans was made for everyone by core migration 023, so only an owner who used
// the app (config row or recorded migrations) has it moved; a fresh data folder no longer gets it.
// The chat channels: the owner's real shape (Telegram and Discord on, Slack and WhatsApp never used);
// their bot settings stay in extension_configs, and channel_events stays Girru's.
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

// The Store's seo and waf-security packages, cut down: the same tables under their Store names, IF NOT EXISTS only.
const sha = (b) => createHash('sha256').update(b).digest('hex');
const packages = {
  seo: {
    'agentplayer.plugin.json': JSON.stringify({ id: 'seo', name: 'SEO', version: '1.1.0', main: 'index.js', permissions: ['database'] }),
    'index.js': 'export default { async register(api) {} };\n',
    'migrations/001_seo_core.sql': [
      'CREATE TABLE IF NOT EXISTS app_seo__seo_domains (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, domain TEXT NOT NULL);',
      'CREATE INDEX IF NOT EXISTS app_seo__idx_domains_user ON app_seo__seo_domains(user_id);',
      'CREATE TABLE IF NOT EXISTS app_seo__seo_keywords (id TEXT PRIMARY KEY, domain_id TEXT NOT NULL, keyword TEXT NOT NULL, FOREIGN KEY (domain_id) REFERENCES app_seo__seo_domains(id) ON DELETE CASCADE);',
      'CREATE INDEX IF NOT EXISTS app_seo__idx_keywords_domain ON app_seo__seo_keywords(domain_id);',
    ].join('\n'),
  },
  'waf-security': {
    'agentplayer.plugin.json': JSON.stringify({ id: 'waf-security', name: 'WAF Security Scanner', version: '1.1.0', main: 'index.js', permissions: ['database'] }),
    'index.js': 'export default { async register(api) {} };\n',
    'migrations/001_waf_scans.sql': [
      "CREATE TABLE IF NOT EXISTS app_waf_security__waf_scans (id TEXT PRIMARY KEY, target_url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')), user_id TEXT);",
      'CREATE INDEX IF NOT EXISTS app_waf_security__idx_scans_user ON app_waf_security__waf_scans(user_id, created_at DESC);',
      'CREATE TABLE IF NOT EXISTS app_waf_security__waf_campaigns (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, target_domain TEXT NOT NULL);',
      'CREATE TABLE IF NOT EXISTS app_waf_security__waf_campaign_scans (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, scan_id TEXT NOT NULL, FOREIGN KEY (campaign_id) REFERENCES app_waf_security__waf_campaigns(id) ON DELETE CASCADE, FOREIGN KEY (scan_id) REFERENCES app_waf_security__waf_scans(id) ON DELETE CASCADE);',
      'CREATE INDEX IF NOT EXISTS app_waf_security__idx_campaign_scans_scan ON app_waf_security__waf_campaign_scans(scan_id);',
    ].join('\n'),
  },
};
// The Store's chat channel packages, cut down the same way: their old tables under Store names.
const channelPackage = (id, sql) => ({
  'agentplayer.plugin.json': JSON.stringify({ id, name: id, version: '1.1.0', main: 'index.js', permissions: ['database', 'tools'] }),
  'index.js': 'export default { async register(api) {} };\n',
  [`migrations/001_${id}_messages.sql`]: sql.join('\n'),
});
packages.telegram = channelPackage('telegram', [
  "CREATE TABLE IF NOT EXISTS app_telegram__telegram_messages (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, content TEXT NOT NULL, timestamp TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'incoming');",
  'CREATE INDEX IF NOT EXISTS app_telegram__idx_telegram_messages_chat ON app_telegram__telegram_messages(chat_id, timestamp DESC);',
  'CREATE TABLE IF NOT EXISTS app_telegram__telegram_config (id INTEGER PRIMARY KEY CHECK (id = 1), bot_token TEXT, allowed_users TEXT);',
]);
packages.discord = channelPackage('discord', [
  "CREATE TABLE IF NOT EXISTS app_discord__discord_messages (id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, guild_id TEXT, content TEXT NOT NULL, author TEXT NOT NULL, author_id TEXT NOT NULL, timestamp TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'incoming');",
  'CREATE INDEX IF NOT EXISTS app_discord__idx_discord_messages_channel ON app_discord__discord_messages(channel_id, timestamp DESC);',
  'CREATE TABLE IF NOT EXISTS app_discord__discord_config (id INTEGER PRIMARY KEY CHECK (id = 1), bot_token TEXT, client_id TEXT, guild_id TEXT, allowed_channels TEXT);',
]);
const CHANNEL_IDS = ['telegram', 'discord'];
const item = (id, name) => {
  const list = Object.entries(packages[id]).map(([path, body]) => ({ path, sha256: sha(Buffer.from(body)), size: Buffer.byteLength(body) })).sort((a, b) => a.path.localeCompare(b.path));
  return { id, kind: 'app', name, summary: `${name}.`, description: name, icon: null, maker: 'Girru', version: '1.1.0', updated: '2026-10-30', category: 'more', permissions: ['Keeps its data in its own tables'], worksWith: [], languages: ['English'], pricing: { model: 'free' }, package: { files: list, sha256: sha(JSON.stringify(list)) } };
};
const index = { schema: 1, featured: null, collections: [], items: [item('seo', 'SEO'), item('waf-security', 'WAF Security'), ...CHANNEL_IDS.map((id) => item(id, id))] };
let storeUp = false;
globalThis.fetch = async (url) => {
  const u = String(url);
  const m = /^https:\/\/store\.test\/apps\/([a-z-]+)\/package\/(.+)$/.exec(u);
  const body = !storeUp ? undefined : u === 'https://store.test/index.json' ? JSON.stringify(index) : m ? packages[m[1]]?.[m[2]] : undefined;
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

// waf-security. An older Girru made waf_scans for everyone (core migration 023, no longer); the
// app's own migrations added user_id, the other tables and two views over them.
function oldWaf() {
  db.exec(`CREATE TABLE waf_scans (id TEXT PRIMARY KEY, target_url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE INDEX idx_waf_scans_url ON waf_scans(target_url);
    INSERT INTO waf_scans (id, target_url, status) VALUES ('s-1', 'https://example.test', 'completed');`);
}
function wafExtension({ enabled }) {
  db.exec(`ALTER TABLE waf_scans ADD COLUMN user_id TEXT;
    UPDATE waf_scans SET user_id = 'u-1';
    CREATE INDEX idx_waf_scans_user_id ON waf_scans(user_id, created_at DESC);
    CREATE TABLE waf_campaigns (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, target_domain TEXT NOT NULL);
    CREATE TABLE waf_campaign_scans (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, scan_id TEXT NOT NULL, FOREIGN KEY (campaign_id) REFERENCES waf_campaigns(id) ON DELETE CASCADE, FOREIGN KEY (scan_id) REFERENCES waf_scans(id) ON DELETE CASCADE);
    CREATE TABLE waf_campaign_comparisons (id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, regression_detected BOOLEAN DEFAULT 0);
    INSERT INTO waf_campaigns VALUES ('c-1', 'u-1', 'Weekly', 'https://example.test');
    INSERT INTO waf_campaign_scans VALUES ('cs-1', 'c-1', 's-1');
    CREATE VIEW v_campaign_summary AS SELECT c.id, (SELECT COUNT(*) FROM waf_campaign_scans WHERE campaign_id = c.id) AS total_scans FROM waf_campaigns c;
    CREATE VIEW v_latest_comparisons AS SELECT cc.* FROM waf_campaign_comparisons cc INNER JOIN waf_campaigns c ON cc.campaign_id = c.id;`);
  db.prepare("INSERT OR REPLACE INTO extension_configs (extension_id, enabled) VALUES ('waf-security', ?)").run(enabled);
  for (const f of ['001_waf_scans.sql', '002_waf_user_isolation.sql', '003_waf_payload_library.sql', '004_waf_campaigns.sql']) db.prepare("INSERT INTO extension_migrations (extension_id, filename) VALUES ('waf-security', ?)").run(f);
}

test('waf-security: the program ships no extensions/waf-security and a fresh data folder gets no waf_scans', () => {
  assert.ok(!existsSync(join(backendDir, 'extensions', 'waf-security')), 'waf-security comes from the Girru Store now');
  assert.ok(MOVED_APPS.some((a) => a.id === 'waf-security' && a.tables.includes('waf_scans') && a.views?.includes('v_campaign_summary')));
  assert.ok(!table('waf_scans'), 'core migration 023 makes nothing now');
});

test('waf-security: an owner who never used it keeps the old shared waf_scans as it is; nothing is backed up or added again', async () => {
  oldWaf();
  db.prepare("DELETE FROM app_settings WHERE key = 'store.moved.waf-security'").run(); // marked by the first test's start: start from an older Girru
  let backedUp = 0;
  assert.deepEqual(await moveLegacyAppTables({ backup: async () => { backedUp++; } }), []);
  assert.equal(backedUp, 0);
  assert.ok(table('waf_scans') && !table('app_waf_security__waf_scans'));
  assert.ok(setting('store.moved.waf-security'));
  assert.equal(setting('store.reinstall.waf-security'), undefined);
  db.prepare("DELETE FROM app_settings WHERE key = 'store.moved.waf-security'").run(); // next: the same Girru, used
});

test('waf-security: an owner who used it gets every table moved with its rows after a backup, the views dropped, and it is added again turned on', async () => {
  wafExtension({ enabled: 1 });
  let backedUp = 0;
  assert.deepEqual(await moveLegacyAppTables({ backup: async () => { backedUp++; assert.ok(table('waf_scans'), 'backup before the rename'); } }), ['waf-security']);
  assert.equal(backedUp, 1);
  for (const t of ['waf_scans', 'waf_campaigns', 'waf_campaign_scans', 'waf_campaign_comparisons']) assert.ok(!table(t) && table(`app_waf_security__${t}`), t);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'view' AND name IN ('v_campaign_summary', 'v_latest_comparisons')").get().n, 0, 'views dropped');
  assert.deepEqual(indexes('app_waf_security__waf_scans'), [], 'old index names go, the one core made too');
  assert.match(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'app_waf_security__waf_campaign_scans'").get().sql, /REFERENCES "?app_waf_security__waf_scans"?/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM extension_migrations WHERE extension_id = 'waf-security'").get().n, 0);
  assert.equal(JSON.parse(setting('store.reinstall.waf-security')).enabled, true);

  storeUp = true;
  const done = await reinstallMovedApps();
  assert.deepEqual(done.map((d) => [d.id, d.ok]), [['waf-security', true]], done[0]?.message);
  assert.equal(setting('store.reinstall.waf-security'), undefined);
  assert.deepEqual(db.prepare('SELECT id, user_id FROM app_waf_security__waf_scans').all().map((r) => ({ ...r })), [{ id: 's-1', user_id: 'u-1' }], 'the moved rows stay');
  assert.equal(db.prepare('SELECT name FROM app_waf_security__waf_campaigns').get().name, 'Weekly');
  assert.deepEqual(indexes('app_waf_security__waf_scans'), ['app_waf_security__idx_scans_user'], 'the Store copy made its index on the moved table');
  assert.equal(db.prepare("SELECT enabled FROM extension_configs WHERE extension_id = 'waf-security'").get().enabled, 1, 'it was on: it stays on');
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

// The chat channels, in the shape of the owner's real data folder: those used are on, with their 001
// migration recorded, bot settings in extension_configs and the tables their bundled copy made (a few
// rows here); those never used have nothing. channel_events is Girru's channel host's: no app owns it.
const CHANNELS = {
  telegram: {
    used: true,
    old: `CREATE TABLE telegram_messages (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, content TEXT NOT NULL, timestamp TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'incoming');
      CREATE INDEX idx_telegram_messages_chat ON telegram_messages(chat_id, timestamp DESC);
      CREATE TABLE telegram_config (id INTEGER PRIMARY KEY CHECK (id = 1), bot_token TEXT, allowed_users TEXT);
      INSERT INTO telegram_messages VALUES ('m-1', 'chat-1', 'hello', '2026-10-01T10:00:00Z', 'incoming'), ('m-2', 'chat-1', 'hi', '2026-10-01T10:00:01Z', 'outgoing');`,
    config: { bot_token: 'fixture-telegram-token', allowed_users: 'sender-1', auto_reply: true, owner_user_id: 'u-1' },
    rows: { app_telegram__telegram_messages: 2, app_telegram__telegram_config: 0 },
    index: 'app_telegram__idx_telegram_messages_chat',
  },
  discord: {
    used: true,
    old: `CREATE TABLE discord_messages (id TEXT PRIMARY KEY, channel_id TEXT NOT NULL, guild_id TEXT, content TEXT NOT NULL, author TEXT NOT NULL, author_id TEXT NOT NULL, timestamp TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'incoming');
      CREATE INDEX idx_discord_messages_channel ON discord_messages(channel_id, timestamp DESC);
      CREATE INDEX idx_discord_messages_created ON discord_messages(timestamp DESC);
      CREATE TABLE discord_config (id INTEGER PRIMARY KEY CHECK (id = 1), bot_token TEXT, client_id TEXT, guild_id TEXT, allowed_channels TEXT);
      INSERT INTO discord_messages VALUES ('d-1', 'room-1', 'guild-1', 'hello', 'Sender', 'sender-1', '2026-10-01T10:00:00Z', 'incoming');`,
    config: { bot_token: 'fixture-discord-token', allowed_users: ['sender-1'], allowed_channels: ['room-1'], guild_id: 'guild-1', auto_reply: false, owner_user_id: 'u-1' },
    rows: { app_discord__discord_messages: 1, app_discord__discord_config: 0 },
    index: 'app_discord__idx_discord_messages_channel',
  },
  slack: { used: false },
  whatsapp: { used: false },
};
const used = Object.entries(CHANNELS).filter(([, c]) => c.used).map(([id]) => id);

test('chat channels: the program ships none of them; their old tables are listed to move, channel_events never', () => {
  for (const id of Object.keys(CHANNELS)) {
    assert.ok(!existsSync(join(backendDir, 'extensions', id)), `${id} comes from the Girru Store now`);
    assert.ok(MOVED_APPS.some((a) => a.id === id && a.tables.length === 2), id);
  }
  assert.ok(!MOVED_APPS.some((a) => a.tables.includes('channel_events')), 'channel_events stays with Girru');
});

test('chat channels: the used ones move with their rows after one backup and come back on with their bot settings untouched; the others are left alone; once', async () => {
  db.prepare("DELETE FROM app_settings WHERE key LIKE 'store.reinstall.%' OR key = 'store.girru-store'").run(); // earlier tests' leftovers; a fresh Store read
  for (const id of Object.keys(CHANNELS)) db.prepare('DELETE FROM app_settings WHERE key = ?').run(`store.moved.${id}`); // start from an older Girru
  db.exec(`CREATE TABLE IF NOT EXISTS channel_events (channel TEXT NOT NULL, conversation_id TEXT NOT NULL, id TEXT NOT NULL, sender_id TEXT NOT NULL, sender_name TEXT, content TEXT NOT NULL, timestamp TEXT NOT NULL, direction TEXT NOT NULL, state TEXT NOT NULL, PRIMARY KEY (channel, conversation_id, id, direction));
    INSERT INTO channel_events VALUES ('telegram', 'chat-1', 'e-1', 'sender-1', 'Sender', 'hello', '2026-10-01T10:00:00Z', 'incoming', 'processed');`);
  for (const id of used) {
    db.exec(CHANNELS[id].old);
    db.prepare('INSERT OR REPLACE INTO extension_configs (extension_id, enabled, config_json) VALUES (?, 1, ?)').run(id, JSON.stringify(CHANNELS[id].config));
    db.prepare('INSERT INTO extension_migrations (extension_id, filename) VALUES (?, ?)').run(id, `001_${id}_messages.sql`);
  }
  const config = (id) => db.prepare('SELECT enabled, config_json FROM extension_configs WHERE extension_id = ?').get(id);
  const before = Object.fromEntries(used.map((id) => [id, config(id).config_json]));

  let backedUp = 0;
  const moved = await moveLegacyAppTables({ backup: async () => { backedUp++; for (const id of used) assert.ok(Object.keys(CHANNELS[id].rows).every((t) => table(t.split('__')[1])), 'backup before the rename'); } });
  assert.deepEqual(moved.sort(), [...used].sort());
  assert.equal(backedUp, 1, 'one backup for all of them');
  for (const id of used) {
    for (const [t, n] of Object.entries(CHANNELS[id].rows)) {
      assert.ok(!table(t.split('__')[1]) && table(t), t);
      assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n, n, t);
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM extension_migrations WHERE extension_id = ?').get(id).n, 0);
    assert.equal(JSON.parse(setting(`store.reinstall.${id}`)).enabled, true);
  }
  for (const id of Object.keys(CHANNELS).filter((x) => !used.includes(x))) {
    assert.ok(setting(`store.moved.${id}`), `${id} marked done`);
    assert.equal(setting(`store.reinstall.${id}`), undefined, `${id} was never used: not added`);
    assert.equal(config(id), undefined);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM channel_events').get().n, 1, 'channel_events is not touched');

  storeUp = true;
  const done = await reinstallMovedApps();
  assert.deepEqual(done.map((d) => [d.id, d.ok]).sort(), used.map((id) => [id, true]).sort(), JSON.stringify(done));
  for (const id of used) {
    assert.ok(existsSync(join(data, 'apps', id, 'index.js')), `${id} in the data folder`);
    assert.equal(config(id).enabled, 1, `${id} was on: it stays on`);
    assert.equal(config(id).config_json, before[id], `${id}: the bot settings are kept as they were`);
    assert.deepEqual(indexes(Object.keys(CHANNELS[id].rows)[0]), [CHANNELS[id].index]);
    for (const [t, n] of Object.entries(CHANNELS[id].rows)) assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n, n, `${t} keeps its rows`);
  }
  for (const id of Object.keys(CHANNELS).filter((x) => !used.includes(x))) assert.ok(!existsSync(join(data, 'apps', id)), `${id} not added`);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM channel_events').get().n, 1);
  let again = 0;
  assert.deepEqual(await moveLegacyAppTables({ backup: async () => { again++; } }), [], 'once');
  assert.equal(again, 0);
  assert.deepEqual(await reinstallMovedApps(), []);
});
