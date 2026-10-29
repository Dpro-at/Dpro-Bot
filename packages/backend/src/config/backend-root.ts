/**
 * MACAPP-01: the folder the backend program itself lives in (packages/backend, or
 * <Girru.app>/Contents/Resources/payload/backend), found from this file, never from the
 * working folder. Parts that ship with the program (extensions, skills) are read from
 * here, so they load the same in a dev run, the test copy and the installed app, where
 * the working folder is the data folder's parent.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** src/config (or dist/config) -> the backend package folder. */
export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const backendPath = (...parts: string[]): string => path.join(BACKEND_ROOT, ...parts);
/** The extensions folder: next to the program; GIRRU_EXTENSIONS_DIR (absolute) points tests at their own. */
export function extensionsRoot(): string {
  const env = (process.env.GIRRU_EXTENSIONS_DIR ?? '').trim();
  return env && path.isAbsolute(env) ? path.resolve(env) : backendPath('extensions');
}
