/**
 * MACAPP-01: the folder the backend program itself lives in (packages/backend, or
 * <Girru.app>/Contents/Resources/payload/backend), found from this file, never from the
 * working folder. Parts that ship with the program (extensions, skills) are read from
 * here, so they load the same in a dev run, the test copy and the installed app, where
 * the working folder is the data folder's parent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { dataPath } from './data-root.js';
import { fileURLToPath } from 'node:url';

/** src/config (or dist/config) -> the backend package folder. */
export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const backendPath = (...parts: string[]): string => path.join(BACKEND_ROOT, ...parts);
/** The extensions folder: next to the program; GIRRU_EXTENSIONS_DIR (absolute) points tests at their own. */
export function extensionsRoot(): string {
  const env = (process.env.GIRRU_EXTENSIONS_DIR ?? '').trim();
  return env && path.isAbsolute(env) ? path.resolve(env) : backendPath('extensions');
}

/** APPS-06: apps added from the Girru Store live in the data folder, never next to the program. */
export const installedAppsRoot = (): string => dataPath('apps');
/** Both places extensions load from: those that ship with the program, then those added from the Store. */
export const extensionRoots = (): string[] => [extensionsRoot(), installedAppsRoot()];
/** The folder that holds an extension's own folder: the program's when it ships with it, else the Store's. */
export function extensionBase(id: string): string {
  return fs.existsSync(path.join(extensionsRoot(), id)) ? extensionsRoot() : installedAppsRoot();
}
