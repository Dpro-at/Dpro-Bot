/**
 * Doctor Command (INST-09)
 *
 * `agent-player doctor [--fix] [--json]`: local checks of the install. See
 * utils/doctor-checks.ts. Exit code 1 when any check fails.
 */

import chalk from 'chalk';
import { findInstall, NOT_FOUND_MESSAGE, type InstallPaths } from '../utils/install-root.js';
import { realContext, runDoctor, type CheckResult, type DoctorContext } from '../utils/doctor-checks.js';

const ICON: Record<CheckResult['status'], string> = { ok: chalk.green('ok  '), warn: chalk.yellow('warn'), fail: chalk.red('FAIL'), skip: chalk.gray('skip') };

export function formatResults(results: CheckResult[], fix: boolean): string {
  const lines = results.map((r) => {
    const fixed = r.fixed ? chalk.cyan(`  [fixed: ${r.fixed}]`) : (!fix && r.fixable && r.status !== 'ok' ? chalk.gray('  [--fix can repair]') : '');
    return `${ICON[r.status]}  ${r.title}: ${chalk.gray(r.detail)}${fixed}`;
  });
  const count = (s: CheckResult['status']) => results.filter((r) => r.status === s).length;
  lines.push('');
  lines.push(`${count('ok')} ok, ${count('warn')} warning(s), ${count('fail')} failed, ${count('skip')} skipped`);
  return lines.join('\n');
}

export async function doctorCommand(
  options: { fix?: boolean; json?: boolean } = {},
  deps: { paths?: InstallPaths | null; context?: Partial<DoctorContext>; log?: (m: string) => void } = {},
): Promise<number> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const paths = deps.paths === undefined ? findInstall() : deps.paths;
  if (!paths) {
    log(options.json ? JSON.stringify({ error: NOT_FOUND_MESSAGE }) : chalk.red(NOT_FOUND_MESSAGE));
    return 1;
  }
  const ctx: DoctorContext = { ...realContext(paths, !!options.fix), ...deps.context, paths, fix: !!options.fix };
  const results = await runDoctor(ctx);
  if (options.json) log(JSON.stringify({ root: paths.root, fix: !!options.fix, results }, null, 2));
  else {
    log(chalk.bold(`Girru doctor — ${paths.root}${options.fix ? ' (--fix)' : ''}`));
    log(formatResults(results, !!options.fix));
  }
  return results.some((r) => r.status === 'fail') ? 1 : 0;
}
