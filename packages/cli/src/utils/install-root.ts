/**
 * Find the Girru install folder without relying on the shell's
 * current folder (INST-04).
 *
 * Order:
 *  1. $AGENT_PLAYER_ROOT
 *  2. the folder that contains this CLI package (repo / release layout)
 *  3. the path recorded by `agent-player setup` / `start` in
 *     <CLI config dir>/install.json
 *
 * A folder counts as an install only when it has package.json and
 * packages/backend/package.json named "@agent-player/backend".
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfigDir } from './auth-store.js';

export const BACKEND_PACKAGE_NAME = '@agent-player/backend';
const INSTALL_FILE_NAME = 'install.json';
const MARKER = 'agent-player-cli';

export type RootSource = 'env' | 'package' | 'recorded';

export interface InstallPaths {
  root: string;
  backendDir: string;
  /** Backend data folder (`packages/backend/.data`, the backend's working folder + .data). */
  dataDir: string;
  logsDir: string;
  runDir: string;
  source: RootSource;
}

export function isInstallRoot(dir: string): boolean {
  try {
    if (!fs.existsSync(path.join(dir, 'package.json'))) return false;
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'packages', 'backend', 'package.json'), 'utf-8'));
    return pkg?.name === BACKEND_PACKAGE_NAME;
  } catch {
    return false;
  }
}

export function pathsFor(root: string, source: RootSource): InstallPaths {
  const backendDir = path.join(root, 'packages', 'backend');
  const dataDir = path.join(backendDir, '.data');
  return {
    root,
    backendDir,
    dataDir,
    logsDir: path.join(dataDir, 'logs'),
    runDir: path.join(dataDir, 'run'),
    source,
  };
}

export function installRecordPath(configDir: string = getConfigDir()): string {
  return path.join(configDir, INSTALL_FILE_NAME);
}

export function readRecordedRoot(configDir: string = getConfigDir()): string | null {
  try {
    const data = JSON.parse(fs.readFileSync(installRecordPath(configDir), 'utf-8'));
    if (data?.createdBy === MARKER && typeof data.root === 'string' && path.isAbsolute(data.root)) return data.root;
  } catch {
    // none recorded
  }
  return null;
}

/** Record the install folder (file 0600, directory 0700). Returns the file path. */
export function recordInstallRoot(root: string, configDir: string = getConfigDir()): string {
  fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  const file = installRecordPath(configDir);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ createdBy: MARKER, root, savedAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  return file;
}

/** Walk up from a folder until an install root is found. */
export function findRootAbove(start: string): string | null {
  let dir = path.resolve(start);
  for (;;) {
    if (isInstallRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export interface FindOptions {
  env?: NodeJS.ProcessEnv;
  /** Folder of the running CLI module (default: this file's folder). */
  moduleDir?: string;
  configDir?: string;
}

export function findInstall(options: FindOptions = {}): InstallPaths | null {
  const env = options.env ?? process.env;
  const fromEnv = env.AGENT_PLAYER_ROOT;
  if (fromEnv) {
    const root = path.resolve(fromEnv);
    return isInstallRoot(root) ? pathsFor(root, 'env') : null;
  }
  const moduleDir = options.moduleDir ?? path.dirname(fileURLToPath(import.meta.url));
  const fromPackage = findRootAbove(moduleDir);
  if (fromPackage) return pathsFor(fromPackage, 'package');
  const recorded = readRecordedRoot(options.configDir);
  if (recorded && isInstallRoot(recorded)) return pathsFor(recorded, 'recorded');
  return null;
}

export const NOT_FOUND_MESSAGE =
  'Girru install folder not found. Set AGENT_PLAYER_ROOT to the folder that contains packages/backend, '
  + 'or run "girru setup" from inside the install once.';
