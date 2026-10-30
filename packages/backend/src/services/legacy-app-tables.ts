/**
 * APPS-06 step 3: apps that used to ship with Girru now come from the Girru Store, where an
 * app may only own tables named app_<id>__... (store-install appTables). For someone who
 * already used one, its old tables are renamed once, after a backup, so the data stays; the
 * app is then added again from the Store in the background, and its migrations
 * (CREATE ... IF NOT EXISTS) keep the moved tables and rows. SQLite only, like every extension.
 * "Used one" means Girru has a row for it in extension_configs (on or off) or ran its migrations,
 * so an app with no tables moves too, and a table some old Girru made for everyone does not count.
 * The next app that moves only adds an entry to MOVED_APPS.
 */
import { startAdd, type AddJob, type Fetch } from './store-install.js';

/**
 * Apps moved out of the program into the Girru Store, with the table names they had there and
 * the views their old migrations made over them (a Store app cannot make views; they are dropped).
 */
export const MOVED_APPS: ReadonlyArray<{ id: string; tables: readonly string[]; views?: readonly string[] }> = [
  { id: 'seo', tables: ['seo_domains', 'seo_keywords', 'seo_scraper_jobs', 'seo_search_analytics', 'seo_gsc_sync_log', 'seo_settings'] },
];

const MOVED = (id: string) => `store.moved.${id}`;
export const REINSTALL = (id: string) => `store.reinstall.${id}`;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const prefixOf = (id: string) => `app_${id.replace(/-/g, '_')}__`;
const quote = (t: string) => `"${t.replace(/"/g, '""')}"`;
const message = (error: unknown) => (error instanceof Error ? error.message : 'unknown error');
type Db = { prepare(s: string): { get(...a: unknown[]): any; all(...a: unknown[]): any[]; run(...a: unknown[]): unknown }; exec(s: string): void; transaction<T>(fn: () => T): () => T };

async function sqlite(): Promise<Db | null> {
  const { dbDriver } = await import('../db/pg/config.js');
  if (dbDriver() === 'postgres') return null; // extensions never ran there (Q-33)
  const { getDatabase } = await import('../db/index.js');
  const db = getDatabase().getDb() as Db;
  db.exec('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)');
  return db;
}
const setting = (db: Db, key: string, value: unknown) => db.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').run(key, JSON.stringify(value), Date.now());

/**
 * The one-time move, at startup after the database opens and before extensions load.
 * Only for an app the owner used. Old tables found: a before-update backup first (no backup, no
 * rename: tried again at the next start), then one transaction drops its old views, renames the
 * tables, forgets the app's recorded migrations so the Store copy's run, and marks the app as
 * waiting to be added again, on or off as it was. With nothing to rename, no backup is made.
 * Returns the moved apps.
 */
export async function moveLegacyAppTables(options: { backup?: () => Promise<unknown>; apps?: typeof MOVED_APPS } = {}): Promise<string[]> {
  const db = await sqlite();
  if (!db) return [];
  const apps = (options.apps ?? MOVED_APPS).filter((a) => !db.prepare('SELECT 1 FROM app_settings WHERE key = ?').get(MOVED(a.id)));
  if (!apps.length) return [];
  const has = (t: string, type = 'table') => !!db.prepare('SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?').get(type, t);
  const config = (id: string) => db.prepare('SELECT enabled FROM extension_configs WHERE extension_id = ?').get(id) as { enabled?: number } | undefined;
  const used = (id: string) => !!config(id) || !!db.prepare('SELECT 1 FROM extension_migrations WHERE extension_id = ?').get(id);
  // An old table moves only when the new name is free; a fresh data folder has none to move.
  const found = apps.map((app) => {
    const had = used(app.id);
    return { app, had, old: had ? app.tables.filter((t) => has(t) && !has(prefixOf(app.id) + t)) : [] };
  });
  if (found.some((f) => f.old.length)) {
    try {
      await (options.backup ?? (async () => (await import('./backups.js')).backUpNow('before-update')))();
    } catch (error) {
      console.warn(`[Store] Old app tables not moved: the backup before it failed (${message(error)}); trying again at the next start`);
      return [];
    }
  }
  const at = new Date().toISOString();
  db.transaction(() => {
    for (const { app, had, old } of found) {
      if (had) {
        const enabled = config(app.id)?.enabled === 1;
        for (const v of app.views ?? []) if (has(v, 'view')) db.exec(`DROP VIEW ${quote(v)}`);
        for (const t of old) {
          // Its old indexes go; the Store copy's migrations make them again under its own names.
          for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL").all(t) as Array<{ name: string }>) db.exec(`DROP INDEX IF EXISTS ${quote(name)}`);
          db.exec(`ALTER TABLE ${quote(t)} RENAME TO ${quote(prefixOf(app.id) + t)}`);
        }
        db.prepare('DELETE FROM extension_migrations WHERE extension_id = ?').run(app.id);
        setting(db, REINSTALL(app.id), { enabled, since: at });
      }
      setting(db, MOVED(app.id), { at, tables: old });
    }
  })();
  const moved = found.filter((f) => f.had).map((f) => f.app.id);
  if (moved.length) console.log(`[Store] Moved ${moved.join(', ')} to the Girru Store names; adding ${moved.length === 1 ? 'it' : 'them'} again from the Girru Store`);
  return moved;
}

/**
 * Add again, from the Girru Store, every app waiting since the move: one at a time, in the
 * background, never restarting Girru (it loads at the next start). Success clears the mark
 * and keeps the app off when the owner had turned it off; failure keeps it for the next start.
 */
export async function reinstallMovedApps(options: { fetch?: Fetch } = {}): Promise<Array<{ id: string; ok: boolean; message?: string }>> {
  const db = await sqlite();
  if (!db) return [];
  const out: Array<{ id: string; ok: boolean; message?: string }> = [];
  for (const row of db.prepare("SELECT key, value FROM app_settings WHERE key LIKE 'store.reinstall.%' ORDER BY key").all() as Array<{ key: string; value: string }>) {
    const id = row.key.slice('store.reinstall.'.length);
    if (!ID.test(id)) continue;
    let was: { enabled?: unknown } = {};
    try { was = JSON.parse(row.value); } catch { /* added again turned on */ }
    const job = await new Promise<AddJob>((done) => { startAdd(id, { fetch: options.fetch, restart: () => false, onDone: done }); });
    if (job.ok) {
      db.transaction(() => {
        if (was.enabled === false) db.prepare("UPDATE extension_configs SET enabled = 0, updated_at = datetime('now') WHERE extension_id = ?").run(id);
        db.prepare('DELETE FROM app_settings WHERE key = ?').run(row.key);
      })();
      console.log(`[Store] ${id} was added again from the Girru Store with its data; it loads at the next start`);
    } else {
      console.warn(`[Store] ${id} could not be added again yet (${job.message ?? 'unknown error'}); trying again at the next start`);
    }
    out.push({ id, ok: !!job.ok, message: job.message });
  }
  return out;
}
