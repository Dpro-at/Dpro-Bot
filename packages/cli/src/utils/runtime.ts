/**
 * Process control for `agent-player start | stop | status` (INST-04).
 *
 * `start` runs one supervisor process that starts the backend and the web UI
 * together, both bound to 127.0.0.1, and records itself in a pid/lock file
 * (<data dir>/run/agent-player.json, 0600). A second start is refused while
 * the recorded supervisor is alive. Ctrl-C / `stop` (SIGTERM to the
 * supervisor) ends both children; when one child exits the other is stopped.
 *
 * Everything that touches the OS (spawn, kill, ps, fetch) is injectable so
 * tests never start servers or bind ports.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync, spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'child_process';
import type { InstallPaths } from './install-root.js';

export const LOOPBACK_HOST = '127.0.0.1';
export const BACKEND_PORT = 41522;
export const FRONTEND_PORT = 41521;
export const LOCK_FILE_NAME = 'agent-player.json';
const MARKER = 'agent-player-cli';

export type StartMode = 'production' | 'dev';

export interface ChildPlan {
  name: 'backend' | 'frontend';
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  port: number;
}

export interface LockInfo {
  createdBy: typeof MARKER;
  pid: number;
  /** CLI entry the supervisor runs, used to make sure a pid is still ours. */
  entry: string;
  root: string;
  mode: StartMode;
  startedAt: string;
  children: Partial<Record<'backend' | 'frontend', number>>;
  ports: { backend: number; frontend: number };
}

export class AlreadyRunningError extends Error {
  constructor(public readonly pid: number) {
    super(`Girru is already running (supervisor pid ${pid}). Use "agent-player stop" first.`);
    this.name = 'AlreadyRunningError';
  }
}

export function lockFilePath(paths: InstallPaths): string {
  return path.join(paths.runDir, LOCK_FILE_NAME);
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface BuildState {
  backendBuilt: boolean;
  frontendBuilt: boolean;
}

export function detectBuild(paths: InstallPaths): BuildState {
  return {
    backendBuilt: fs.existsSync(path.join(paths.backendDir, 'dist', 'api', 'server.js')),
    frontendBuilt: fs.existsSync(path.join(paths.root, '.next', 'BUILD_ID')),
  };
}

/**
 * Commands for both children. Production uses the built backend and
 * `next start`; dev (`--dev`) runs the backend from source without a file
 * watcher and `next dev`. Both get HOST=127.0.0.1 (overrides .env) and Next
 * telemetry off.
 */
export function buildStartPlan(paths: InstallPaths, mode: StartMode, nodePath: string = process.execPath, baseEnv: NodeJS.ProcessEnv = process.env): ChildPlan[] {
  const common: NodeJS.ProcessEnv = { ...baseEnv, HOST: LOOPBACK_HOST, NEXT_TELEMETRY_DISABLED: '1', AGENT_PLAYER_ROOT: paths.root };
  const backendArgs = mode === 'production'
    ? [path.join('dist', 'api', 'server.js')]
    : ['--import', 'tsx', path.join('src', 'api', 'server.ts')];
  const nextLocal = path.join(paths.root, 'scripts', 'next-local.mjs');
  return [
    {
      name: 'backend',
      command: nodePath,
      args: backendArgs,
      cwd: paths.backendDir,
      env: { ...common, PORT: String(BACKEND_PORT) },
      port: BACKEND_PORT,
    },
    {
      name: 'frontend',
      command: nodePath,
      args: [nextLocal, mode === 'production' ? 'start' : 'dev', '--hostname', LOOPBACK_HOST, '--port', String(FRONTEND_PORT)],
      cwd: paths.root,
      env: { ...common, PORT: String(FRONTEND_PORT) },
      port: FRONTEND_PORT,
    },
  ];
}

/** Reason the chosen mode cannot start, or null. */
export function startProblem(paths: InstallPaths, mode: StartMode, build: BuildState = detectBuild(paths)): string | null {
  if (!fs.existsSync(path.join(paths.root, 'scripts', 'next-local.mjs'))) return 'scripts/next-local.mjs is missing in the install folder.';
  if (mode === 'dev') return null;
  const missing: string[] = [];
  if (!build.backendBuilt) missing.push('backend (packages/backend/dist)');
  if (!build.frontendBuilt) missing.push('web UI (.next)');
  if (missing.length === 0) return null;
  return `Not built: ${missing.join(' and ')}. Build first, or run "agent-player start --dev" to run from source.`;
}

// ---------------------------------------------------------------------------
// Lock file
// ---------------------------------------------------------------------------

export interface ProcessOps {
  isAlive(pid: number): boolean;
  kill(pid: number, signal: NodeJS.Signals): void;
  /** Command line of a pid ('' when unknown). */
  commandLine(pid: number): string;
}

export const realProcessOps: ProcessOps = {
  isAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (err: any) {
      return err?.code === 'EPERM';
    }
  },
  kill(pid, signal) {
    process.kill(pid, signal);
  },
  commandLine(pid) {
    if (process.platform === 'win32') return '';
    try {
      return execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  },
};

export function readLock(file: string): LockInfo | null {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (data?.createdBy === MARKER && Number.isInteger(data.pid)) return data as LockInfo;
  } catch {
    // none
  }
  return null;
}

function writeLockFile(file: string, info: LockInfo, flag: 'wx' | 'w'): void {
  const fd = fs.openSync(file, flag, 0o600);
  try {
    fs.writeSync(fd, `${JSON.stringify(info, null, 2)}\n`);
  } finally {
    fs.closeSync(fd);
  }
  if (process.platform !== 'win32') fs.chmodSync(file, 0o600);
}

/** True when the lock names a live process that is really our supervisor. */
export function lockIsLive(lock: LockInfo | null, ops: ProcessOps): boolean {
  if (!lock || !ops.isAlive(lock.pid)) return false;
  const cmd = ops.commandLine(lock.pid);
  // Unknown command line (e.g. Windows): trust the live pid.
  return cmd === '' || cmd.includes(lock.entry);
}

/**
 * Take the lock for this process. Refuses when a live supervisor holds it;
 * a stale lock (dead pid, or the pid now belongs to another program) is
 * replaced.
 */
export function acquireLock(file: string, info: LockInfo, ops: ProcessOps = realProcessOps): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  try {
    writeLockFile(file, info, 'wx');
    return;
  } catch (err: any) {
    if (err?.code !== 'EEXIST') throw err;
  }
  const current = readLock(file);
  if (current && current.pid !== info.pid && lockIsLive(current, ops)) throw new AlreadyRunningError(current.pid);
  writeLockFile(file, info, 'w');
}

export function updateLock(file: string, info: LockInfo): void {
  writeLockFile(file, info, 'w');
}

/** Remove the lock only when it is ours (same pid). */
export function releaseLock(file: string, pid: number = process.pid): void {
  const current = readLock(file);
  if (current && current.pid === pid) {
    try { fs.unlinkSync(file); } catch { /* already gone */ }
  }
}

// ---------------------------------------------------------------------------
// Supervisor
// ---------------------------------------------------------------------------

export type SpawnFn = (command: string, args: string[], options: SpawnOptions) => ChildProcess;

export interface SuperviseOptions {
  paths: InstallPaths;
  mode: StartMode;
  entry: string;
  spawn?: SpawnFn;
  ops?: ProcessOps;
  log?: (message: string) => void;
  /** Where signals come from (default: this process). */
  signals?: NodeJS.EventEmitter;
  stdio?: SpawnOptions['stdio'];
  plan?: ChildPlan[];
}

/**
 * Run both children until one exits or a stop signal arrives. Resolves with
 * the exit code the CLI should use. The lock is released before resolving.
 */
export async function supervise(options: SuperviseOptions): Promise<number> {
  const ops = options.ops ?? realProcessOps;
  const spawn = options.spawn ?? (nodeSpawn as SpawnFn);
  const log = options.log ?? ((m: string) => console.log(m));
  const signals = options.signals ?? process;
  const file = lockFilePath(options.paths);
  const plan = options.plan ?? buildStartPlan(options.paths, options.mode);

  const info: LockInfo = {
    createdBy: MARKER,
    pid: process.pid,
    entry: options.entry,
    root: options.paths.root,
    mode: options.mode,
    startedAt: new Date().toISOString(),
    children: {},
    ports: { backend: BACKEND_PORT, frontend: FRONTEND_PORT },
  };
  acquireLock(file, info, ops);

  const children = new Map<string, ChildProcess>();
  let stopping = false;
  let exitCode = 0;
  let resolveDone!: (code: number) => void;
  const done = new Promise<number>((r) => { resolveDone = r; });

  const stopAll = (reason: string) => {
    if (stopping) return;
    stopping = true;
    log(`Stopping Girru (${reason})...`);
    for (const child of children.values()) {
      if (child.exitCode === null && child.signalCode === null) {
        try { child.kill('SIGTERM'); } catch { /* gone */ }
      }
    }
  };

  const onSignal = (sig: NodeJS.Signals) => () => stopAll(sig);
  const handlers: Array<[NodeJS.Signals, () => void]> = [['SIGINT', onSignal('SIGINT')], ['SIGTERM', onSignal('SIGTERM')], ['SIGHUP', onSignal('SIGHUP')]];
  for (const [sig, h] of handlers) signals.on(sig, h);

  try {
    for (const c of plan) {
      const child = spawn(c.command, c.args, { cwd: c.cwd, env: c.env, stdio: options.stdio ?? 'inherit' });
      children.set(c.name, child);
      if (child.pid) info.children[c.name] = child.pid;
      log(`${c.name} starting on http://${LOOPBACK_HOST}:${c.port} (pid ${child.pid ?? '?'})`);
      child.on('error', (err) => {
        log(`${c.name} failed to start: ${err.message}`);
        exitCode = 1;
        stopAll(`${c.name} failed`);
        maybeDone();
      });
      child.on('exit', (code, signal) => {
        if (!stopping) {
          log(`${c.name} exited (${signal ?? `code ${code}`}); stopping the other part.`);
          exitCode = code && code !== 0 ? code : 1;
          stopAll(`${c.name} exited`);
        }
        maybeDone();
      });
    }
    updateLock(file, info);
  } catch (err) {
    stopAll('start failed');
    releaseLock(file);
    for (const [sig, h] of handlers) signals.off(sig, h);
    throw err;
  }

  function maybeDone() {
    for (const child of children.values()) {
      if (child.exitCode === null && child.signalCode === null) return;
    }
    resolveDone(exitCode);
  }

  const code = await done;
  releaseLock(file);
  for (const [sig, h] of handlers) signals.off(sig, h);
  return code;
}

// ---------------------------------------------------------------------------
// Stop
// ---------------------------------------------------------------------------

export interface StopResult {
  state: 'not-running' | 'stale' | 'stopped' | 'timeout';
  pid?: number;
}

export async function stopRunning(paths: InstallPaths, opts: { ops?: ProcessOps; timeoutMs?: number; pollMs?: number; force?: boolean } = {}): Promise<StopResult> {
  const ops = opts.ops ?? realProcessOps;
  const file = lockFilePath(paths);
  const lock = readLock(file);
  if (!lock) return { state: 'not-running' };
  if (!lockIsLive(lock, ops)) {
    // Supervisor gone: stop children that are still ours (they run from the install folder).
    for (const pid of Object.values(lock.children)) {
      if (pid && ops.isAlive(pid) && ops.commandLine(pid).includes(lock.root)) {
        try { ops.kill(pid, 'SIGTERM'); } catch { /* gone */ }
      }
    }
    return { state: 'stale', pid: lock.pid };
  }
  ops.kill(lock.pid, opts.force ? 'SIGKILL' : 'SIGTERM');
  if (opts.force) {
    for (const pid of Object.values(lock.children)) {
      if (pid && ops.isAlive(pid)) { try { ops.kill(pid, 'SIGKILL'); } catch { /* gone */ } }
    }
  }
  const timeoutMs = opts.timeoutMs ?? 15000;
  const pollMs = opts.pollMs ?? 200;
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (!ops.isAlive(lock.pid)) return { state: 'stopped', pid: lock.pid };
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return ops.isAlive(lock.pid) ? { state: 'timeout', pid: lock.pid } : { state: 'stopped', pid: lock.pid };
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export interface PartStatus {
  name: 'supervisor' | 'backend' | 'frontend';
  pid?: number;
  alive: boolean;
  url?: string;
  responding?: boolean;
}

export interface RunStatus {
  running: boolean;
  stale: boolean;
  mode?: StartMode;
  startedAt?: string;
  parts: PartStatus[];
}

async function responds(url: string, fetchFn: typeof fetch, timeoutMs: number): Promise<boolean> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    await fetchFn(url, { signal: ac.signal, redirect: 'manual' });
    return true; // any HTTP answer means the server is up
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function getRunStatus(paths: InstallPaths, opts: { ops?: ProcessOps; fetchFn?: typeof fetch; timeoutMs?: number } = {}): Promise<RunStatus> {
  const ops = opts.ops ?? realProcessOps;
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 2000;
  const lock = readLock(lockFilePath(paths));
  const live = lockIsLive(lock, ops);
  const backendUrl = `http://${LOOPBACK_HOST}:${lock?.ports.backend ?? BACKEND_PORT}/health`;
  const frontendUrl = `http://${LOOPBACK_HOST}:${lock?.ports.frontend ?? FRONTEND_PORT}/`;
  const [b, f] = await Promise.all([responds(backendUrl, fetchFn, timeoutMs), responds(frontendUrl, fetchFn, timeoutMs)]);
  const childAlive = (pid?: number) => !!pid && ops.isAlive(pid);
  return {
    running: live,
    stale: !!lock && !live,
    mode: lock?.mode,
    startedAt: lock?.startedAt,
    parts: [
      { name: 'supervisor', pid: lock?.pid, alive: live },
      { name: 'backend', pid: lock?.children.backend, alive: live && childAlive(lock?.children.backend), url: backendUrl, responding: b },
      { name: 'frontend', pid: lock?.children.frontend, alive: live && childAlive(lock?.children.frontend), url: frontendUrl, responding: f },
    ],
  };
}
