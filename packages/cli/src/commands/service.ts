/**
 * `agent-player service print` (INST-04): print a launchd (macOS) or systemd
 * user (Linux) unit that runs `agent-player start`. Printing only — this
 * command never writes, installs or loads a service.
 */

import os from 'os';
import { findInstall, NOT_FOUND_MESSAGE, type InstallPaths } from '../utils/install-root.js';
import { defaultServicePlatform, installHint, launchdPlist, serviceSpec, systemdUnit, type ServicePlatform } from '../utils/service-templates.js';

export function servicePrintCommand(
  options: { platform?: string } = {},
  deps: { paths?: InstallPaths | null; out?: (s: string) => void; err?: (s: string) => void; home?: string; nodePath?: string } = {},
): number {
  const out = deps.out ?? ((s: string) => process.stdout.write(s));
  const err = deps.err ?? ((s: string) => process.stderr.write(`${s}\n`));
  const paths = deps.paths === undefined ? findInstall() : deps.paths;
  if (!paths) {
    err(NOT_FOUND_MESSAGE);
    return 1;
  }
  const wanted = options.platform?.toLowerCase();
  const platform: ServicePlatform | null = wanted === 'macos' || wanted === 'darwin' ? 'macos'
    : wanted === 'linux' ? 'linux'
    : wanted ? null : defaultServicePlatform();
  if (!platform) {
    err('Unknown platform. Use --platform macos or --platform linux.');
    return 1;
  }
  const spec = serviceSpec(paths, deps.nodePath);
  const hint = installHint(platform, deps.home ?? os.homedir());
  const c = platform === 'macos' ? ['<!--', '-->'] : ['#', ''];
  const comment = (line: string) => (platform === 'macos' ? `${c[0]} ${line.replace(/--/g, '- -')} ${c[1]}` : `# ${line}`);
  const header = [
    comment('Girru service template (printed only; nothing was installed).'),
    comment(`Save as: ${hint.file}`),
    comment(`Load/unload (needs your OK): ${hint.commands.join('  |  ')}`),
    ...(spec.fromSource ? [comment('The CLI is not built; this unit runs it from source through tsx.')] : []),
  ];
  const body = platform === 'macos' ? launchdPlist(spec) : systemdUnit(spec);
  if (platform === 'macos') {
    // the XML declaration must stay first
    const [decl, ...rest] = body.split('\n');
    out(`${decl}\n${header.join('\n')}\n${rest.join('\n')}`);
  } else {
    out(`${header.join('\n')}\n${body}`);
  }
  return 0;
}
