/**
 * Stop Command (INST-04)
 *
 * Stops the supervisor recorded in the pid file (it ends the backend and the
 * web UI). Never kills processes by name.
 */

import chalk from 'chalk';
import { findInstall, NOT_FOUND_MESSAGE, type InstallPaths } from '../utils/install-root.js';
import { stopRunning, type ProcessOps } from '../utils/runtime.js';

export async function stopCommand(
  options: { force?: boolean } = {},
  deps: { paths?: InstallPaths | null; ops?: ProcessOps; log?: (m: string) => void; timeoutMs?: number; pollMs?: number } = {},
): Promise<number> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const paths = deps.paths === undefined ? findInstall() : deps.paths;
  if (!paths) {
    log(chalk.red(NOT_FOUND_MESSAGE));
    return 1;
  }
  const result = await stopRunning(paths, { ops: deps.ops, force: options.force, timeoutMs: deps.timeoutMs, pollMs: deps.pollMs });
  switch (result.state) {
    case 'not-running':
      log(chalk.gray('Girru is not running (no pid file).'));
      return 0;
    case 'stale':
      log(chalk.gray(`Girru is not running (stale pid file for pid ${result.pid}).`));
      return 0;
    case 'stopped':
      log(chalk.green('Girru stopped'));
      return 0;
    default:
      log(chalk.red(`Girru (pid ${result.pid}) did not stop in time. Try "agent-player stop --force".`));
      return 1;
  }
}
