/**
 * Start Command (INST-04)
 *
 * Starts the backend and the web UI together on 127.0.0.1 from any folder.
 * The install folder comes from AGENT_PLAYER_ROOT, the CLI's own location or
 * the path recorded by `agent-player setup` — never the shell's folder.
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { spawn as nodeSpawn, type SpawnOptions, type ChildProcess } from 'child_process';
import { findInstall, recordInstallRoot, NOT_FOUND_MESSAGE, type InstallPaths } from '../utils/install-root.js';
import {
  AlreadyRunningError, LOOPBACK_HOST, FRONTEND_PORT, lockFilePath, lockIsLive, readLock, realProcessOps,
  startProblem, supervise, type ProcessOps, type StartMode,
} from '../utils/runtime.js';
import { backendDataDir, offerSetupToken, type OfferDeps } from '../utils/setup-token.js';

export interface StartOptions {
  daemon?: boolean;
  dev?: boolean;
}

export interface StartDeps {
  paths?: InstallPaths | null;
  ops?: ProcessOps;
  spawn?: (command: string, args: string[], options: SpawnOptions) => ChildProcess;
  log?: (message: string) => void;
  entry?: string;
  execArgv?: string[];
  /** How long --daemon waits for the supervisor's lock file (ms). */
  waitMs?: number;
  /** Interactive terminal for the one-time owner setup code (INSTALLER-07). */
  terminal?: OfferDeps['terminal'];
}

export async function startCommand(options: StartOptions = {}, deps: StartDeps = {}): Promise<number> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const paths = deps.paths === undefined ? findInstall() : deps.paths;
  if (!paths) {
    log(chalk.red(NOT_FOUND_MESSAGE));
    return 1;
  }
  const ops = deps.ops ?? realProcessOps;
  const mode: StartMode = options.dev ? 'dev' : 'production';
  const problem = startProblem(paths, mode);
  if (problem) {
    log(chalk.red(problem));
    return 1;
  }
  const lockFile = lockFilePath(paths);
  const existing = readLock(lockFile);
  if (lockIsLive(existing, ops)) {
    log(chalk.yellow(new AlreadyRunningError(existing!.pid).message));
    return 1;
  }
  try { recordInstallRoot(paths.root); } catch { /* recording is a convenience only */ }
  // INSTALLER-07: first run shows a one-time owner setup code on this
  // terminal only. The daemon child writes to a log file, so it gets no code.
  offerSetupToken({ dataDir: backendDataDir(paths.dataDir), log, terminal: deps.terminal });

  const entry = deps.entry ?? process.argv[1];
  if (options.daemon) {
    fs.mkdirSync(paths.logsDir, { recursive: true, mode: 0o700 });
    const logFile = path.join(paths.logsDir, 'agent-player.log');
    const fd = fs.openSync(logFile, 'a', 0o600);
    try {
      const spawn = deps.spawn ?? nodeSpawn;
      const args = [...(deps.execArgv ?? process.execArgv), entry, 'start', ...(options.dev ? ['--dev'] : [])];
      const child = spawn(process.execPath, args, {
        cwd: paths.root,
        detached: true,
        stdio: ['ignore', fd, fd],
        env: { ...process.env, AGENT_PLAYER_ROOT: paths.root },
      });
      child.unref();
    } finally {
      fs.closeSync(fd);
    }
    const until = Date.now() + (deps.waitMs ?? 5000);
    while (Date.now() < until) {
      const lock = readLock(lockFile);
      if (lock && lockIsLive(lock, ops)) {
        log(chalk.green(`Girru started in the background (pid ${lock.pid}). Web UI: http://${LOOPBACK_HOST}:${FRONTEND_PORT}`));
        log(chalk.gray(`Log: ${logFile}   Stop: agent-player stop`));
        return 0;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    log(chalk.red(`Girru did not start; see ${logFile}`));
    return 1;
  }

  log(chalk.gray(`Starting Girru (${mode}) from ${paths.root}. Press Ctrl+C to stop.`));
  try {
    const code = await supervise({ paths, mode, entry, ops, spawn: deps.spawn, log });
    log(code === 0 ? chalk.green('Girru stopped') : chalk.red(`Girru stopped (exit code ${code})`));
    return code;
  } catch (err: any) {
    log(chalk.red(err?.message ?? String(err)));
    return 1;
  }
}
