/**
 * Service unit templates for `agent-player service print` (INST-04 / INST-08).
 *
 * Text only: nothing here writes, installs or loads a unit. The unit runs
 * `agent-player start` (backend + web UI on 127.0.0.1) as the current user.
 */

import fs from 'fs';
import path from 'path';
import type { InstallPaths } from './install-root.js';

export const LAUNCHD_LABEL = 'com.agentplayer.app';
export const SYSTEMD_UNIT_NAME = 'agent-player.service';

export interface ServiceSpec {
  nodePath: string;
  /** Arguments after node, ending with `start`. */
  args: string[];
  workingDir: string;
  env: Record<string, string>;
  logFile: string;
  /** True when the CLI is not built and the unit runs it through tsx. */
  fromSource: boolean;
}

export function serviceSpec(paths: InstallPaths, nodePath: string = process.execPath, baseEnv: NodeJS.ProcessEnv = process.env): ServiceSpec {
  const built = path.join(paths.root, 'packages', 'cli', 'dist', 'index.js');
  const fromSource = !fs.existsSync(built);
  const args = fromSource
    ? ['--import', 'tsx', path.join(paths.root, 'packages', 'cli', 'src', 'index.ts'), 'start']
    : [built, 'start'];
  const pathDirs = [path.dirname(nodePath), '/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin'];
  return {
    nodePath,
    args,
    workingDir: paths.root,
    env: {
      AGENT_PLAYER_ROOT: paths.root,
      HOST: '127.0.0.1',
      NEXT_TELEMETRY_DISABLED: '1',
      PATH: [...new Set(pathDirs)].join(':'),
      ...(baseEnv.HOME ? { HOME: baseEnv.HOME } : {}),
    },
    logFile: path.join(paths.logsDir, 'agent-player.log'),
    fromSource,
  };
}

function assertPrintable(values: string[]): void {
  for (const v of values) {
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(v)) throw new Error('A path contains control characters; refusing to print a service unit.');
  }
}

function xml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function launchdPlist(spec: ServiceSpec): string {
  assertPrintable([spec.nodePath, ...spec.args, spec.workingDir, spec.logFile, ...Object.values(spec.env)]);
  const s = (v: string) => `<string>${xml(v)}</string>`;
  const envLines = Object.entries(spec.env).map(([k, v]) => `      <key>${xml(k)}</key>${s(v)}`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>${s(LAUNCHD_LABEL)}
    <key>ProgramArguments</key>
    <array>
${[spec.nodePath, ...spec.args].map((a) => `      ${s(a)}`).join('\n')}
    </array>
    <key>WorkingDirectory</key>${s(spec.workingDir)}
    <key>EnvironmentVariables</key>
    <dict>
${envLines}
    </dict>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key>
    <dict>
      <key>SuccessfulExit</key><false/>
    </dict>
    <key>ThrottleInterval</key><integer>10</integer>
    <key>Umask</key><integer>63</integer>
    <key>ProcessType</key>${s('Background')}
    <key>StandardOutPath</key>${s(spec.logFile)}
    <key>StandardErrorPath</key>${s(spec.logFile)}
  </dict>
</plist>
`;
}

/** systemd quoting: double quotes, escape \ and ", and % as %%. */
function sd(v: string): string {
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%')}"`;
}

export function systemdUnit(spec: ServiceSpec): string {
  assertPrintable([spec.nodePath, ...spec.args, spec.workingDir, spec.logFile, ...Object.values(spec.env)]);
  const env = Object.entries(spec.env).map(([k, v]) => `Environment=${sd(`${k}=${v}`)}`).join('\n');
  return `[Unit]
Description=Girru (backend + web UI on 127.0.0.1)
After=network.target

[Service]
Type=simple
WorkingDirectory=${sd(spec.workingDir)}
${env}
ExecStart=${[spec.nodePath, ...spec.args].map(sd).join(' ')}
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
StandardOutput=append:${spec.logFile.replace(/%/g, '%%')}
StandardError=append:${spec.logFile.replace(/%/g, '%%')}

[Install]
WantedBy=default.target
`;
}

export type ServicePlatform = 'macos' | 'linux';

export function defaultServicePlatform(platform: NodeJS.Platform = process.platform): ServicePlatform | null {
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  return null;
}

/** Where the unit would go and the commands that would load it (printed as comments, never run). */
export function installHint(platform: ServicePlatform, home: string): { file: string; commands: string[] } {
  if (platform === 'macos') {
    const file = path.join(home, 'Library', 'LaunchAgents', `${LAUNCHD_LABEL}.plist`);
    return { file, commands: [`launchctl bootstrap gui/$(id -u) ${file}`, `launchctl bootout gui/$(id -u)/${LAUNCHD_LABEL}`] };
  }
  const file = path.join(home, '.config', 'systemd', 'user', SYSTEMD_UNIT_NAME);
  return { file, commands: ['systemctl --user daemon-reload', `systemctl --user enable --now ${SYSTEMD_UNIT_NAME}`, `systemctl --user disable --now ${SYSTEMD_UNIT_NAME}`] };
}
