/**
 * One-time owner setup code (INSTALLER-07), CLI side.
 *
 * While setup is not finished, `agent-player setup` and `start` create a
 * random code, store only its SHA-256 hash in <data dir>/setup-token.json
 * (0600) and show the code on this computer's terminal. The app's first-run
 * screen needs the code to create the owner (POST /api/setup/admin, loopback
 * only); the backend deletes the file once the owner exists.
 *
 * Never written to a log: without a terminal (daemon child, service, CI)
 * nothing is issued and only a hint is printed.
 *
 * File format shared with packages/backend/src/auth/setup-token.ts:
 *   { "v": 1, "hash": "<64 hex>", "createdAt": "<ISO time>" }
 */

import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

export const SETUP_TOKEN_FILE = 'setup-token.json';
export const SETUP_FLAG_FILE = '.setup_complete';
/** The core-ui origin (fixed loopback port; INSTALLER-03 will serve it from `start`). */
export const CORE_UI_ORIGIN = 'http://127.0.0.1:42522';

/** The backend's data folder: AGENT_PLAYER_DATA_DIR when set, else the install's .data. */
export function backendDataDir(defaultDir: string, env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.AGENT_PLAYER_DATA_DIR ?? '').trim();
  return raw ? path.resolve(raw) : defaultDir;
}

export function setupFinished(dataDir: string): boolean {
  return fs.existsSync(path.join(dataDir, SETUP_FLAG_FILE));
}

/** Create a new code (replacing an older one); returns the plain value. Never log it. */
export function issueSetupToken(dataDir: string, now: Date = new Date()): string {
  const token = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(token, 'utf8').digest('hex');
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const file = path.join(dataDir, SETUP_TOKEN_FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ v: 1, hash, createdAt: now.toISOString() })}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  return token;
}

/** Local link that carries the code in the fragment (never sent to a server or kept in history). */
export function setupLink(token: string): string {
  return `${CORE_UI_ORIGIN}/#setup=${token}`;
}

export interface OfferDeps {
  dataDir: string;
  /** Lines that may end up in a log: never given the code. */
  log: (message: string) => void;
  /** Writes straight to the interactive terminal only. */
  terminal?: { isTTY?: boolean; write: (text: string) => unknown };
}

/**
 * Show a fresh owner setup code on the terminal while setup is not finished.
 * Returns 'issued', 'no-terminal' (hint only, nothing issued) or 'done'.
 */
export function offerSetupToken(deps: OfferDeps): 'issued' | 'no-terminal' | 'done' {
  if (setupFinished(deps.dataDir)) return 'done';
  const terminal = deps.terminal ?? process.stdout;
  if (!terminal.isTTY) {
    deps.log('Owner account not created yet. Run `girru setup` in a terminal on this computer to get a one-time setup code.');
    return 'no-terminal';
  }
  const token = issueSetupToken(deps.dataDir);
  terminal.write(
    '\nCreate the owner account (one use, valid 24 hours, this computer only):\n'
    + `  Open:        ${setupLink(token)}\n`
    + `  Setup code:  ${token}\n`
    + 'Keep this code private. Running setup again replaces it.\n\n',
  );
  return 'issued';
}
