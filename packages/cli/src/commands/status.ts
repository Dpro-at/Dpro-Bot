/**
 * Status Command (INST-04)
 *
 * Shows the supervisor, backend and web UI: pid, alive, and whether each
 * answers on 127.0.0.1. Talks only to the loopback addresses.
 */

import chalk from 'chalk';
import { findInstall, NOT_FOUND_MESSAGE, type InstallPaths } from '../utils/install-root.js';
import { getRunStatus, type ProcessOps, type RunStatus } from '../utils/runtime.js';

export function formatStatus(status: RunStatus, root: string): string {
  const lines: string[] = [];
  lines.push(chalk.bold(`Girru — ${status.running ? chalk.green('running') : chalk.red('not running')}${status.stale ? chalk.gray(' (stale pid file)') : ''}`));
  lines.push(chalk.gray(`Install: ${root}${status.mode ? `   Mode: ${status.mode}` : ''}${status.startedAt ? `   Since: ${status.startedAt}` : ''}`));
  for (const p of status.parts) {
    const proc = p.pid ? `pid ${p.pid} ${p.alive ? chalk.green('alive') : chalk.red('not alive')}` : chalk.gray('no pid');
    const http = p.url ? `  ${p.responding ? chalk.green('answers') : chalk.red('no answer')} ${chalk.gray(p.url)}` : '';
    lines.push(`  ${p.name.padEnd(10)} ${proc}${http}`);
  }
  return lines.join('\n');
}

export async function statusCommand(
  options: { json?: boolean } = {},
  deps: { paths?: InstallPaths | null; ops?: ProcessOps; fetchFn?: typeof fetch; log?: (m: string) => void } = {},
): Promise<number> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const paths = deps.paths === undefined ? findInstall() : deps.paths;
  if (!paths) {
    log(chalk.red(NOT_FOUND_MESSAGE));
    return 1;
  }
  const status = await getRunStatus(paths, { ops: deps.ops, fetchFn: deps.fetchFn });
  log(options.json ? JSON.stringify({ root: paths.root, ...status }, null, 2) : formatStatus(status, paths.root));
  return status.running ? 0 : 3;
}
