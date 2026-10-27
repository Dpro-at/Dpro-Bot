/**
 * Uninstall Command (INST-12)
 *
 * `agent-player uninstall [--apply] [--delete-data] [--stop]`. A dry run by
 * default: it lists what would be removed and what is kept. --apply removes
 * the listed items. Data is kept unless --delete-data is given and the owner
 * types `DELETE MY DATA`. See utils/uninstall.ts.
 */

import chalk from 'chalk';
import os from 'os';
import { getConfigDir } from '../utils/auth-store.js';
import { findInstall, NOT_FOUND_MESSAGE, type InstallPaths } from '../utils/install-root.js';
import { ask } from '../utils/prompt.js';
import { lockFilePath, lockIsLive, readLock, realProcessOps, stopRunning, type ProcessOps } from '../utils/runtime.js';
import { applyUninstall, DELETE_DATA_CONFIRMATION, planUninstall, type PlanItem } from '../utils/uninstall.js';

export interface UninstallOptions {
  apply?: boolean;
  dryRun?: boolean;
  deleteData?: boolean;
  stop?: boolean;
}

export interface UninstallDeps {
  paths?: InstallPaths | null;
  home?: string;
  configDir?: string;
  ops?: ProcessOps;
  ask?: (question: string) => Promise<string>;
  log?: (m: string) => void;
  stopTimeoutMs?: number;
}

const line = (i: PlanItem) => `  ${i.kind.padEnd(10)} ${i.path}${i.type === 'dir' ? '/' : ''}${i.note ? chalk.gray(`  (${i.note})`) : ''}`;

export async function uninstallCommand(options: UninstallOptions = {}, deps: UninstallDeps = {}): Promise<number> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const paths = deps.paths === undefined ? findInstall() : deps.paths;
  if (!paths) {
    log(chalk.red(NOT_FOUND_MESSAGE));
    return 1;
  }
  const home = deps.home ?? os.homedir();
  const configDir = deps.configDir ?? getConfigDir();
  const ops = deps.ops ?? realProcessOps;
  const apply = !!options.apply && !options.dryRun;

  const lock = readLock(lockFilePath(paths));
  if (lockIsLive(lock, ops)) {
    if (!(apply && options.stop)) {
      const msg = `Girru is running (pid ${lock!.pid}).`;
      if (apply) {
        log(chalk.red(`${msg} Stop it first, or pass --stop.`));
        return 1;
      }
      log(chalk.yellow(`${msg} It must be stopped before --apply (or pass --stop).`));
    } else {
      const r = await stopRunning(paths, { ops, timeoutMs: deps.stopTimeoutMs });
      if (r.state === 'timeout') {
        log(chalk.red(`Girru (pid ${r.pid}) did not stop in time; nothing was removed.`));
        return 1;
      }
      log('Stopped the running Girru.');
    }
  }

  const plan = planUninstall(paths, { home, configDir, deleteData: !!options.deleteData });
  log(chalk.bold(`Girru uninstall — ${paths.root}${apply ? '' : ' (dry run: nothing is removed)'}`));
  log(apply ? 'Removing:' : 'Would remove:');
  log(plan.remove.length ? plan.remove.map(line).join('\n') : '  (nothing)');
  log('Kept:');
  log(plan.keep.length ? plan.keep.map(line).join('\n') : '  (nothing)');
  log(`  source     ${paths.root}/  ${chalk.gray('(the app folder is never removed; delete it yourself if you want)')}`);
  if (plan.hints.length) log(`Unload the service before removing it: ${plan.hints.join('  |  ')}`);

  if (!apply) {
    log(chalk.gray(`${plan.remove.length} item(s) would be removed. Run with --apply to remove them${options.deleteData ? '' : '; add --delete-data to also remove your data'}.`));
    return 0;
  }

  if (options.deleteData) {
    log(chalk.red('This permanently deletes your databases, secrets, memories, uploads and backups.'));
    const answer = await (deps.ask ?? ask)(`Type ${DELETE_DATA_CONFIRMATION} to confirm: `);
    if (answer.trim() !== DELETE_DATA_CONFIRMATION) {
      log(chalk.yellow('Confirmation did not match; nothing was removed.'));
      return 1;
    }
  }

  const result = applyUninstall(plan, { root: paths.root, home, configDir });
  for (const f of result.failed) log(chalk.red(`  not removed: ${f.path} (${f.error})`));
  log(`${result.removed} item(s) removed${result.failed.length ? `, ${result.failed.length} failed` : ''}.`);
  return result.failed.length ? 1 : 0;
}
