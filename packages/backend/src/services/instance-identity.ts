/**
 * Backend instance identity (MCP-01b).
 *
 * Local clients that send the owner's token (the Dpro Bot MCP server)
 * first check that the process on the loopback port really is this
 * install's backend and not some other local program that took the port.
 *
 *  - The backend keeps a per-install id + secret in `.data/instance.json`
 *    (mode 0600, created once).
 *  - At startup it copies them next to the CLI token, to
 *    `<CLI config dir>/instance.json` (0600, directory 0700; same directory
 *    rules as the CLI: $AGENT_PLAYER_CONFIG_DIR, $XDG_CONFIG_HOME/agent-player,
 *    %APPDATA%\agent-player, ~/.config/agent-player).
 *  - `GET /api/instance?nonce=<random>` (public) answers
 *    { id, proof = HMAC-SHA256(secret, "agent-player-instance-v1:" + id + ":" + nonce) }.
 *    The client compares it with its own HMAC and sends the token only on a
 *    match. The secret itself is never sent.
 */

import { dataRootOverride } from '../config/data-root.js';
import { dataPath } from '../config/data-root.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';

export const INSTANCE_FILE_NAME = 'instance.json';
export const INSTANCE_MARKER = 'agent-player-backend';
const PROOF_CONTEXT = 'agent-player-instance-v1';

export interface InstanceIdentity { id: string; secret: string }

export function instanceDataFile(): string {
  return dataPath(INSTANCE_FILE_NAME);
}

/** CLI config directory (same rules as packages/cli/src/utils/auth-store.ts). */
export function cliConfigDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.AGENT_PLAYER_CONFIG_DIR) return env.AGENT_PLAYER_CONFIG_DIR;
  // RUN-ISO F1: with a data root, the CLI config copy stays inside it.
  const root = dataRootOverride(env);
  if (root) return path.join(root, 'cli-config');
  if (env.XDG_CONFIG_HOME) return path.join(env.XDG_CONFIG_HOME, 'agent-player');
  if (process.platform === 'win32' && env.APPDATA) return path.join(env.APPDATA, 'agent-player');
  return path.join(os.homedir(), '.config', 'agent-player');
}

function valid(x: any): x is InstanceIdentity {
  return !!x && typeof x.id === 'string' && /^[0-9a-f-]{36}$/i.test(x.id) && typeof x.secret === 'string' && /^[0-9a-f]{64}$/i.test(x.secret);
}

function writePrivate(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(tmp, 0o600); } catch { /* best effort */ }
  fs.renameSync(tmp, file);
}

let cached: InstanceIdentity | null = null;

/** The install's identity; created on first use. */
export function getInstanceIdentity(): InstanceIdentity {
  if (cached) return cached;
  const file = instanceDataFile();
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (valid(data)) {
      try { fs.chmodSync(file, 0o600); } catch { /* best effort */ }
      cached = { id: data.id, secret: data.secret };
      return cached;
    }
  } catch { /* missing or unreadable: create */ }
  const fresh: InstanceIdentity = { id: randomUUID(), secret: randomBytes(32).toString('hex') };
  writePrivate(file, { version: 1, ...fresh, createdAt: new Date().toISOString() });
  cached = fresh;
  return fresh;
}

/** Test hook: forget the cached identity. */
export function resetInstanceIdentityCache(): void { cached = null; }

/**
 * Copy the identity next to the CLI token so local clients can verify the
 * backend. Never overwrites a file that is not the backend's own copy.
 * Returns the path written, or null when it was left alone.
 */
export function publishInstanceIdentity(env: NodeJS.ProcessEnv = process.env): string | null {
  const ident = getInstanceIdentity();
  const file = path.join(cliConfigDir(env), INSTANCE_FILE_NAME);
  try {
    const cur = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (cur?.createdBy !== INSTANCE_MARKER) return null;
    const st = fs.statSync(file);
    if (cur.id === ident.id && cur.secret === ident.secret && (process.platform === 'win32' || (st.mode & 0o077) === 0)) return file;
  } catch { /* missing: write */ }
  writePrivate(file, { createdBy: INSTANCE_MARKER, version: 1, id: ident.id, secret: ident.secret, savedAt: new Date().toISOString() });
  return file;
}

export function instanceProof(secret: string, id: string, nonce: string): string {
  return createHmac('sha256', Buffer.from(secret, 'hex')).update(`${PROOF_CONTEXT}:${id}:${nonce}`).digest('hex');
}

export const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
