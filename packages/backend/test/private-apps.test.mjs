// SA6 (board StoreOne): a private app is added by the owner from a folder in their home folder.
// Girru checks it like an app from the Girru Store (app file, file rules, only its own tables),
// copies it into the data folder, marks it private and turns it on; My apps lists it; removing it
// works like removing a Store app. It is never listed in the Store.
// No network. Run: node --import tsx --test test/private-apps.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-private-apps-'));
const home = join(dir, 'home'), data = join(dir, '.data'), shipped = join(dir, 'shipped');
mkdirSync(join(data, 'multi-agent'), { recursive: true });
mkdirSync(join(shipped, 'telegram'), { recursive: true });
mkdirSync(home, { recursive: true });
process.chdir(dir);
process.env.HOME = home;
process.env.AGENT_PLAYER_DATA_DIR = data;
process.env.DATABASE_PATH = join(data, 'agent-player.db');
process.env.GIRRU_BACKUPS_DIR = join(dir, 'Girru Backups');
process.env.GIRRU_EXTENSIONS_DIR = shipped;
process.env.GIRRU_STORE_REPO = 'off';
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
const quiet = () => {}; console.log = quiet; console.warn = quiet; console.error = quiet;

/** Writes an app folder inside the test home folder. */
function app(name, files) {
  const root = join(home, name);
  for (const [p, body] of Object.entries(files)) { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), body); }
  return root;
}
const manifest = (extra = {}) => JSON.stringify({ id: 'my-crm', name: 'My CRM', version: '0.1.0', main: 'index.js', ...extra });
const good = { 'agentplayer.plugin.json': manifest(), 'index.js': 'export default { async register() {} };\n', 'migrations/001.sql': 'CREATE TABLE IF NOT EXISTS app_my_crm__contacts (id INTEGER PRIMARY KEY, name TEXT);\n', 'node_modules/x/huge.bin': 'skipped' };

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { addPrivateApp } = await import(join(backendDir, 'src/services/private-apps.ts'));
const { installedApps } = await import(join(backendDir, 'src/services/store-install.ts'));
const { uninstallFromStore, readStore, localCatalogue } = await import(join(backendDir, 'src/services/store-catalogue.ts'));
const { listWorkspaceApps } = await import(join(backendDir, 'src/services/workspace-apps.ts'));
const sources = { servers: async () => [], account: async () => ({ status: 'not_connected' }), state: () => 'disconnected' };
const table = (t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);

test('add from a folder: checked, copied into the data folder, its own tables, on, marked private', async () => {
  const r = await addPrivateApp(app('crm', good), { home, restart: () => false });
  assert.deepEqual(r, { ok: true, id: 'my-crm', name: 'My CRM', restart: 'manual' });
  assert.ok(existsSync(join(data, 'apps', 'my-crm', 'index.js')));
  assert.ok(!existsSync(join(data, 'apps', 'my-crm', 'node_modules')), 'node_modules is never copied');
  assert.ok(table('app_my_crm__contacts'));
  assert.equal(db.prepare("SELECT enabled FROM extension_configs WHERE extension_id = 'my-crm'").get().enabled, 1);
  assert.equal((await installedApps())['my-crm'].source, 'private');
  // My apps shows it as a private app; the Store never lists it.
  const mine = (await listWorkspaceApps('owner-1', sources)).items.find((x) => x.id === 'app:my-crm');
  assert.equal(mine.kind, 'added'); assert.equal(mine.origin, 'private'); assert.equal(mine.removable, true);
  const store = await readStore('owner-1', localCatalogue({ home }));
  assert.ok(!store.items.some((x) => x.id.endsWith('my-crm')));
});

test('refused before anything is written: outside home, links, other tables, bad app file, taken names', async () => {
  const outside = mkdtempSync(join(tmpdir(), 'ap-private-outside-'));
  writeFileSync(join(outside, 'agentplayer.plugin.json'), manifest({ id: 'outside' }));
  assert.equal((await addPrivateApp(outside, { home })).code, 'invalid_folder');
  assert.equal((await addPrivateApp('../', { home })).code, 'invalid_folder');
  assert.equal((await addPrivateApp(join(data, 'apps'), { home })).code, 'invalid_folder');
  const linked = app('linked', { ...good, 'agentplayer.plugin.json': manifest({ id: 'linked' }) });
  symlinkSync('/etc/hosts', join(linked, 'hosts.txt'));
  assert.match((await addPrivateApp(linked, { home })).message, /is a link/);
  const sneaky = app('sneaky', { ...good, 'agentplayer.plugin.json': manifest({ id: 'sneaky' }), 'migrations/001.sql': 'CREATE TABLE IF NOT EXISTS app_sneaky__x (id INTEGER); DROP TABLE users;' });
  assert.match((await addPrivateApp(sneaky, { home })).message, /does more than make its own tables/);
  assert.equal(table('users'), true);
  assert.match((await addPrivateApp(app('noid', { ...good, 'agentplayer.plugin.json': manifest({ id: 'Bad--Id' }) }), { home })).message, /app id/);
  assert.match((await addPrivateApp(app('nomain', { ...good, 'agentplayer.plugin.json': manifest({ id: 'nomain', main: 'gone.js' }) }), { home })).message, /main file/);
  assert.match((await addPrivateApp(app('script', { ...good, 'agentplayer.plugin.json': manifest({ id: 'script' }), 'run.sh': 'rm -rf /' }), { home })).message, /not a file type/);
  assert.equal((await addPrivateApp(app('tg', { ...good, 'agentplayer.plugin.json': manifest({ id: 'telegram' }) }), { home })).code, 'exists');
  for (const id of ['outside', 'linked', 'sneaky', 'nomain', 'script', 'telegram']) assert.ok(!existsSync(join(data, 'apps', id)), id);
});

test('remove a private app: with rows it asks once and saves a copy; then it is gone from My apps', async () => {
  db.prepare("INSERT INTO app_my_crm__contacts (name) VALUES ('Sara')").run();
  const asked = await uninstallFromStore('owner-1', 'private:my-crm', { restart: () => false });
  assert.equal(asked.code, 'has_data');
  const r = await uninstallFromStore('owner-1', 'private:my-crm', { confirm: true, restart: () => false });
  assert.equal(r.ok, true); assert.ok(r.copy && existsSync(r.copy));
  assert.ok(!table('app_my_crm__contacts')); assert.ok(!existsSync(join(data, 'apps', 'my-crm')));
  assert.ok(!(await listWorkspaceApps('owner-1', sources)).items.some((x) => x.id === 'app:my-crm'));
});
