/**
 * `agent-player update` for a git checkout install (INST-11).
 *
 * Order:
 *  1. refuse while Girru runs (or stop it first with --stop, through
 *     the pid/lock file from INST-04a);
 *  2. refuse when the checkout has uncommitted changes to tracked files;
 *  3. pick the target: `--to <ref>` or the branch's upstream. Network is used
 *     only with --fetch (`git fetch`); otherwise the target must already be
 *     present locally. Only fast-forward moves are allowed;
 *  4. consistent backup into <data dir>/backups/update-<timestamp>/ (0700):
 *     every SQLite database in the data dir through the SQLite online backup
 *     API, each copy checked with `PRAGMA integrity_check`, plus secrets.env
 *     and instance.json (all files 0600) and a manifest with the recorded
 *     commit;
 *  5. move the checkout to the target;
 *  6. run the backend's own migrations in a separate process;
 *  7. health check in a separate process: the real app (buildServer) answers
 *     GET /health through inject(), no port is bound;
 *  8. on any failure after the backup: automatic rollback — databases and
 *     secrets are restored from the backup and the checkout goes back to the
 *     recorded commit. Files that appeared during the failed update are moved
 *     into the backup folder, never deleted. The backup is never deleted.
 *
 * Output: counts and paths only, never secret values. Everything that touches
 * git, child processes or SQLite is injectable so tests never use the network
 * or start a server.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { spawn as nodeSpawn, spawnSync } from 'child_process';
import type { InstallPaths } from './install-root.js';
import { lockFilePath, lockIsLive, readLock, realProcessOps, stopRunning, type ProcessOps, type SpawnFn } from './runtime.js';
import { SECRETS_FILE_NAME } from './secrets-file.js';

export const BACKUPS_DIR_NAME = 'backups';
export const INSTANCE_FILE_NAME = 'instance.json';
export const TASK_RESULT_PREFIX = 'AGENT_PLAYER_TASK_RESULT ';
export const UPDATE_TASKS_SOURCE = path.join('src', 'maintenance', 'update-tasks.ts');
const SQLITE_MAGIC = Buffer.from('SQLite format 3\u0000', 'latin1');
const PRIVATE_FILES = [SECRETS_FILE_NAME, INSTANCE_FILE_NAME] as const;

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

export interface GitResult { code: number; stdout: string; stderr: string }
export type GitRunner = (args: string[]) => GitResult;

export function realGit(cwd: string): GitRunner {
  return (args) => {
    const r = spawnSync('git', args, {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: r.status ?? 1, stdout: (r.stdout ?? '').trim(), stderr: (r.stderr ?? '').trim() };
  };
}

// ---------------------------------------------------------------------------
// SQLite (better-sqlite3 from the backend's own dependencies)
// ---------------------------------------------------------------------------

/** Load better-sqlite3 the way the backend does (the CLI does not depend on it). */
export function loadSqliteFrom(dir: string): any {
  const req = createRequire(path.join(dir, 'package.json'));
  return req('better-sqlite3');
}

export function isSqliteFile(file: string): boolean {
  let fd: number | null = null;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(SQLITE_MAGIC.length);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    return n === buf.length && buf.equals(SQLITE_MAGIC);
  } catch {
    return false;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

/** Relative paths of every SQLite database under the data dir (no symlinks, not inside backups/). */
export function findSqliteDatabases(dataDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const relPath = rel ? path.join(rel, e.name) : e.name;
      const abs = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if ((!rel && e.name === BACKUPS_DIR_NAME) || e.name === 'node_modules') continue;
        walk(abs, relPath);
      } else if (e.isFile()) {
        if (/-(wal|shm|journal)$/.test(e.name)) continue;
        if (isSqliteFile(abs)) out.push(relPath);
      }
    }
  };
  walk(dataDir, '');
  return out.sort();
}

function sha256File(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function integrityOk(Database: any, file: string): boolean {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    return db.pragma('integrity_check', { simple: true }) === 'ok';
  } finally {
    db.close();
  }
}

/** Consistent copy through the online backup API; the copy is a single file (journal_mode DELETE). */
export async function backupDatabase(Database: any, src: string, dest: string): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  let db: any;
  try {
    db = new Database(src, { readonly: true, fileMustExist: true });
  } catch {
    db = new Database(src, { fileMustExist: true });
  }
  try {
    await db.backup(dest);
  } finally {
    db.close();
  }
  const copy = new Database(dest, { fileMustExist: true });
  try {
    copy.pragma('journal_mode = DELETE');
  } finally {
    copy.close();
  }
  chmodPrivate(dest);
  if (!integrityOk(Database, dest)) throw new Error(`integrity_check failed for the backup of ${path.basename(src)}`);
}

function chmodPrivate(file: string, mode = 0o600): void {
  if (process.platform !== 'win32') fs.chmodSync(file, mode);
}

function mkdirPrivate(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') fs.chmodSync(dir, 0o700);
}

function copyPrivate(src: string, dest: string): void {
  mkdirPrivate(path.dirname(dest));
  const tmp = `${dest}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.copyFileSync(src, tmp);
  chmodPrivate(tmp);
  fs.renameSync(tmp, dest);
  chmodPrivate(dest);
}

// ---------------------------------------------------------------------------
// Backup / restore
// ---------------------------------------------------------------------------

export interface BackupManifest {
  createdBy: 'agent-player-cli';
  kind: 'update';
  createdAt: string;
  root: string;
  dataDir: string;
  commit: string;
  branch: string | null;
  target: string;
  databases: Array<{ path: string; bytes: number; sha256: string }>;
  /** Private files that existed at backup time (names only). */
  files: string[];
  /** Private files that did not exist at backup time. */
  absentFiles: string[];
}

export function newBackupDir(dataDir: string, now: Date): string {
  const base = path.join(dataDir, BACKUPS_DIR_NAME);
  mkdirPrivate(base);
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  for (let i = 0; ; i++) {
    const dir = path.join(base, `update-${stamp}${i ? `-${i}` : ''}`);
    try {
      fs.mkdirSync(dir, { mode: 0o700 });
      chmodPrivate(dir, 0o700);
      return dir;
    } catch (err: any) {
      if (err?.code !== 'EEXIST') throw err;
    }
  }
}

export async function createBackup(Database: any, paths: InstallPaths, dir: string, info: { commit: string; branch: string | null; target: string; now: Date }): Promise<BackupManifest> {
  const databases: BackupManifest['databases'] = [];
  for (const rel of findSqliteDatabases(paths.dataDir)) {
    const dest = path.join(dir, 'db', rel);
    await backupDatabase(Database, path.join(paths.dataDir, rel), dest);
    databases.push({ path: rel, bytes: fs.statSync(dest).size, sha256: sha256File(dest) });
  }
  const files: string[] = [];
  const absentFiles: string[] = [];
  for (const name of PRIVATE_FILES) {
    const src = path.join(paths.dataDir, name);
    const st = fs.lstatSync(src, { throwIfNoEntry: false });
    if (st?.isFile()) {
      copyPrivate(src, path.join(dir, 'files', name));
      files.push(name);
    } else {
      absentFiles.push(name);
    }
  }
  const manifest: BackupManifest = {
    createdBy: 'agent-player-cli',
    kind: 'update',
    createdAt: info.now.toISOString(),
    root: paths.root,
    dataDir: paths.dataDir,
    commit: info.commit,
    branch: info.branch,
    target: info.target,
    databases,
    files,
    absentFiles,
  };
  const mf = path.join(dir, 'manifest.json');
  fs.writeFileSync(mf, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  chmodPrivate(mf);
  return manifest;
}

/** Move a file that must not stay in place into the backup folder (never delete). */
function moveAside(src: string, backupDir: string, rel: string): void {
  const dest = path.join(backupDir, 'rollback-leftovers', rel);
  mkdirPrivate(path.dirname(dest));
  fs.renameSync(src, fs.existsSync(dest) ? `${dest}.${Date.now()}` : dest);
}

export interface RestoreReport { databases: number; files: number; movedAside: number }

export function restoreBackup(Database: any, paths: InstallPaths, dir: string, manifest: BackupManifest): RestoreReport {
  let movedAside = 0;
  const known = new Set(manifest.databases.map((d) => d.path));
  for (const d of manifest.databases) {
    const target = path.join(paths.dataDir, d.path);
    for (const suffix of ['-wal', '-shm', '-journal']) {
      if (fs.existsSync(target + suffix)) { moveAside(target + suffix, dir, d.path + suffix); movedAside++; }
    }
    const copy = path.join(dir, 'db', d.path);
    if (sha256File(copy) !== d.sha256) throw new Error(`backup copy of ${d.path} changed since the backup`);
    copyPrivate(copy, target);
    if (!integrityOk(Database, target)) throw new Error(`integrity_check failed after restoring ${d.path}`);
  }
  // Databases created by the failed update do not belong to the old version.
  for (const rel of findSqliteDatabases(paths.dataDir)) {
    if (known.has(rel)) continue;
    const abs = path.join(paths.dataDir, rel);
    for (const suffix of ['-wal', '-shm', '-journal']) {
      if (fs.existsSync(abs + suffix)) { moveAside(abs + suffix, dir, rel + suffix); movedAside++; }
    }
    moveAside(abs, dir, rel);
    movedAside++;
  }
  for (const name of manifest.files) copyPrivate(path.join(dir, 'files', name), path.join(paths.dataDir, name));
  for (const name of manifest.absentFiles) {
    const abs = path.join(paths.dataDir, name);
    if (fs.existsSync(abs)) { moveAside(abs, dir, name); movedAside++; }
  }
  return { databases: manifest.databases.length, files: manifest.files.length, movedAside };
}

// ---------------------------------------------------------------------------
// Backend tasks (separate process)
// ---------------------------------------------------------------------------

export type BackendTask = 'migrate' | 'health';
export interface TaskOutcome { ok: boolean; result?: Record<string, unknown>; reason?: string }
export type TaskRunner = (task: BackendTask) => Promise<TaskOutcome>;

export function parseTaskResult(stdout: string): Record<string, unknown> | null {
  const lines = stdout.split(/\r?\n/).filter((l) => l.startsWith(TASK_RESULT_PREFIX));
  if (lines.length === 0) return null;
  try { return JSON.parse(lines[lines.length - 1].slice(TASK_RESULT_PREFIX.length)); } catch { return null; }
}

function tsxImport(backendDir: string): string {
  try {
    return pathToFileURL(createRequire(path.join(backendDir, 'package.json')).resolve('tsx')).href;
  } catch {
    return 'tsx';
  }
}

/**
 * Run a backend maintenance task from source (the dist folder may still be
 * the old build) in the backend folder. Output goes to a 0600 log file in the
 * backup folder, never to the terminal.
 */
export function backendTaskRunner(paths: InstallPaths, logFile: string, opts: { spawn?: SpawnFn; timeoutMs?: number; nodePath?: string } = {}): TaskRunner {
  const spawn = opts.spawn ?? (nodeSpawn as SpawnFn);
  return (task) => new Promise<TaskOutcome>((resolve) => {
    const args = ['--import', tsxImport(paths.backendDir), path.join(paths.backendDir, UPDATE_TASKS_SOURCE), task];
    const env = { ...process.env, AGENT_PLAYER_ROOT: paths.root, HOST: '127.0.0.1', NODE_ENV: process.env.NODE_ENV || 'production' };
    let stdout = '';
    let settled = false;
    const fd = fs.openSync(logFile, 'a', 0o600);
    chmodPrivate(logFile);
    fs.writeSync(fd, `\n=== ${task} ${new Date().toISOString()} ===\n`);
    const finish = (outcome: TaskOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { fs.closeSync(fd); } catch { /* closed */ }
      resolve(outcome);
    };
    const child = spawn(opts.nodePath ?? process.execPath, args, { cwd: paths.backendDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* gone */ }
      finish({ ok: false, reason: `${task} timed out` });
    }, opts.timeoutMs ?? 5 * 60_000);
    child.stdout?.on('data', (b: Buffer) => { stdout += b.toString(); try { fs.writeSync(fd, b); } catch { /* closed */ } });
    child.stderr?.on('data', (b: Buffer) => { try { fs.writeSync(fd, b); } catch { /* closed */ } });
    child.on('error', (err) => finish({ ok: false, reason: `${task} could not start (${err.message})` }));
    child.on('close', (code) => {
      const result = parseTaskResult(stdout);
      if (code === 0 && result?.ok === true) finish({ ok: true, result });
      else finish({ ok: false, result: result ?? undefined, reason: `${task} failed (exit ${code})` });
    });
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface UpdateOptions {
  /** Target ref (default: the current branch's upstream). */
  to?: string;
  /** Allow `git fetch` (network) before resolving the target. */
  fetch?: boolean;
  /** Stop a running Girru first instead of refusing. */
  stop?: boolean;
}

export interface UpdateDeps {
  paths: InstallPaths;
  git?: GitRunner;
  /** Runs a backend task; receives the update log file. */
  taskRunner?: (logFile: string) => TaskRunner;
  ops?: ProcessOps;
  /** better-sqlite3 constructor. */
  sqlite?: any;
  log?: (message: string) => void;
  now?: () => Date;
  stopTimeoutMs?: number;
}

export type UpdateState = 'refused' | 'up-to-date' | 'updated' | 'rolled-back' | 'rollback-failed';

export interface UpdateResult {
  state: UpdateState;
  code: number;
  reason?: string;
  from?: string;
  to?: string;
  backupDir?: string;
  databases?: number;
}

const short = (sha: string) => sha.slice(0, 12);

function samePath(a: string, b: string): boolean {
  try { return fs.realpathSync(a) === fs.realpathSync(b); } catch { return path.resolve(a) === path.resolve(b); }
}

const DEP_FILE = /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/;

export async function runUpdate(options: UpdateOptions, deps: UpdateDeps): Promise<UpdateResult> {
  const { paths } = deps;
  const log = deps.log ?? ((m: string) => console.log(m));
  const git = deps.git ?? realGit(paths.root);
  const ops = deps.ops ?? realProcessOps;
  const now = deps.now ?? (() => new Date());
  const refuse = (reason: string): UpdateResult => ({ state: 'refused', code: 1, reason });

  // 1. git checkout install only (release tarballs come with INST-05/06)
  const top = git(['rev-parse', '--show-toplevel']);
  if (top.code !== 0 || !samePath(top.stdout, paths.root)) {
    return refuse('This install is not a git checkout. Updating release installs comes later.');
  }

  // 2. not while running
  const lock = readLock(lockFilePath(paths));
  if (lockIsLive(lock, ops)) {
    if (!options.stop) return refuse(`Girru is running (pid ${lock!.pid}). Stop it first, or pass --stop.`);
    const stopped = await stopRunning(paths, { ops, timeoutMs: deps.stopTimeoutMs });
    if (stopped.state !== 'stopped' && stopped.state !== 'stale' && stopped.state !== 'not-running') {
      return refuse(`Girru (pid ${stopped.pid}) did not stop in time.`);
    }
    log('Stopped the running Girru.');
  }

  // 3. clean tracked files
  const dirty = git(['status', '--porcelain', '--untracked-files=no']);
  if (dirty.code !== 0) return refuse('git status failed.');
  if (dirty.stdout) return refuse(`The checkout has uncommitted changes (${dirty.stdout.split('\n').length} files). Commit or stash them first.`);

  const head = git(['rev-parse', '--verify', 'HEAD']);
  if (head.code !== 0) return refuse('Cannot read the current commit.');
  const fromSha = head.stdout;
  const branchRes = git(['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const branch = branchRes.code === 0 && branchRes.stdout ? branchRes.stdout : null;

  // 4. target (network only with --fetch)
  const ref = options.to ?? '@{upstream}';
  if (ref.startsWith('-') || /[\s\u0000-\u001f]/.test(ref)) return refuse('Invalid --to ref.');
  if (options.fetch) {
    log('Fetching from the remote (--fetch)...');
    const f = git(['fetch', '--quiet']);
    if (f.code !== 0) return refuse('git fetch failed.');
  }
  const target = git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  if (target.code !== 0 || !target.stdout) {
    return refuse(options.to
      ? `Ref "${options.to}" is not present locally${options.fetch ? '' : ' (pass --fetch to download it)'}.`
      : `No upstream for the current branch; pass --to <ref>${options.fetch ? '' : ' (and --fetch to download it)'}.`);
  }
  const toSha = target.stdout;
  if (toSha === fromSha) {
    log(`Already up to date (${short(fromSha)}).`);
    return { state: 'up-to-date', code: 0, from: fromSha, to: toSha };
  }
  if (git(['merge-base', '--is-ancestor', fromSha, toSha]).code !== 0) {
    return refuse(`${short(toSha)} is not a fast-forward of ${short(fromSha)}; nothing was changed.`);
  }

  // 5. backup
  let Database: any;
  try {
    Database = deps.sqlite ?? loadSqliteFrom(paths.backendDir);
  } catch {
    return refuse('better-sqlite3 (backend dependency) is not installed; cannot make a safe backup.');
  }
  mkdirPrivate(paths.dataDir);
  const backupDir = newBackupDir(paths.dataDir, now());
  let manifest: BackupManifest;
  try {
    manifest = await createBackup(Database, paths, backupDir, { commit: fromSha, branch, target: toSha, now: now() });
  } catch (err: any) {
    return { ...refuse(`Backup failed (${String(err?.message ?? err).slice(0, 200)}); nothing was changed.`), backupDir };
  }
  log(`Backup: ${manifest.databases.length} database(s), ${manifest.files.length} private file(s) -> ${backupDir}`);
  const logFile = path.join(backupDir, 'update.log');
  const runTask = (deps.taskRunner ?? ((lf: string) => backendTaskRunner(paths, lf)))(logFile);

  // 6-8. checkout, migrate, health; roll back on any failure
  let failure: string | null = null;
  let moved = false;
  const co = branch ? git(['merge', '--ff-only', '--quiet', toSha]) : git(['checkout', '--quiet', '--detach', toSha]);
  if (co.code !== 0) failure = 'git checkout of the target failed';
  else moved = true;

  if (!failure) {
    const changedDeps = git(['diff', '--name-only', fromSha, toSha]).stdout.split('\n').filter((f) => DEP_FILE.test(f));
    if (changedDeps.length) log(`Note: ${changedDeps.length} dependency file(s) changed; install packages before starting if the migration fails on a missing module.`);
    log(`Checked out ${short(toSha)} (was ${short(fromSha)}). Running migrations...`);
    const m = await runTask('migrate');
    if (!m.ok) failure = m.reason ?? 'migration failed';
    else log(`Migrations ok (${Number(m.result?.appliedMigrations ?? 0)} applied in total).`);
  }
  if (!failure) {
    const h = await runTask('health');
    if (!h.ok) failure = h.reason ?? 'health check failed';
    else log('Health check ok.');
  }

  if (!failure) {
    log(`Updated ${short(fromSha)} -> ${short(toSha)}. Backup kept at ${backupDir}`);
    log('Rebuild before a production start (or use "agent-player start --dev"), then run "agent-player start".');
    return { state: 'updated', code: 0, from: fromSha, to: toSha, backupDir, databases: manifest.databases.length };
  }

  log(`Update failed: ${failure}. Rolling back (details: ${logFile})...`);
  const problems: string[] = [];
  if (moved || git(['rev-parse', 'HEAD']).stdout !== fromSha) {
    const back = branch ? git(['checkout', '--quiet', '-B', branch, fromSha]) : git(['checkout', '--quiet', '--detach', fromSha]);
    if (back.code !== 0 || git(['rev-parse', 'HEAD']).stdout !== fromSha) problems.push(`git checkout of ${short(fromSha)} failed`);
  }
  try {
    const r = restoreBackup(Database, paths, backupDir, manifest);
    log(`Restored ${r.databases} database(s) and ${r.files} private file(s)${r.movedAside ? `; ${r.movedAside} new file(s) moved into the backup folder` : ''}.`);
  } catch (err: any) {
    problems.push(`restore failed (${String(err?.message ?? err).slice(0, 200)})`);
  }
  if (problems.length) {
    log(`ROLLBACK INCOMPLETE: ${problems.join('; ')}. Your backup is intact at ${backupDir} (commit ${short(fromSha)}).`);
    return { state: 'rollback-failed', code: 2, reason: failure, from: fromSha, to: toSha, backupDir };
  }
  log(`Rolled back to ${short(fromSha)}. Backup kept at ${backupDir}`);
  return { state: 'rolled-back', code: 1, reason: failure, from: fromSha, to: toSha, backupDir };
}
