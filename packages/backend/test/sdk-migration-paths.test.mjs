// H-04 / APPS-06: an extension's migrations must be inside its own folder. The check compares
// real paths, so an app in a data folder reached through a symlink (macOS /var -> /private/var)
// runs its migrations, and a migration file that links outside the folder is refused.
// Run: node --import tsx --test test/sdk-migration-paths.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const { createExtensionApi } = await import('../src/plugins/sdk.ts');

function setup(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'ap-sdk-paths-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const real = join(root, 'real', 'apps', 'demo');
  mkdirSync(join(real, 'migrations'), { recursive: true });
  writeFileSync(join(real, 'migrations', '001.sql'), 'CREATE TABLE IF NOT EXISTS app_demo__items (id INTEGER PRIMARY KEY);');
  symlinkSync(join(root, 'real'), join(root, 'linked'));
  const db = new Database(':memory:');
  db.exec('CREATE TABLE extension_migrations (extension_id TEXT, filename TEXT)');
  t.after(() => db.close());
  return { root, real, db };
}

test('migrations run when the app folder is reached through a symlink', async (t) => {
  const { root, real, db } = setup(t);
  // The runner knows the folder by one spelling, the app names its file by the other.
  const api = createExtensionApi('demo', {}, db, null, join(root, 'linked', 'apps', 'demo'));
  await api.runMigrations([join(real, 'migrations', '001.sql')]);
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'app_demo__items'").get());
});

test('a migration that links outside the app folder is refused', async (t) => {
  const { root, real, db } = setup(t);
  writeFileSync(join(root, 'outside.sql'), 'CREATE TABLE stolen (id INTEGER);');
  symlinkSync(join(root, 'outside.sql'), join(real, 'migrations', '002.sql'));
  const api = createExtensionApi('demo', {}, db, null, real);
  await assert.rejects(api.runMigrations([join(real, 'migrations', '002.sql')]), /outside extension directory/);
  assert.equal(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'stolen'").get(), undefined);
});
