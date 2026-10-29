/**
 * Side-effect module: load `.env`, then the generated secrets (INST-02).
 *
 * Import it as the very first import of an entry point. ES module imports are
 * evaluated in order before the importing module's body runs, so a `dotenv`
 * call in the body would run after every other import has already read
 * process.env.
 *
 * RUN-ISO F3: with AGENT_PLAYER_ISOLATED=1 (set by scripts/isolated-server.ts)
 * the isolation rules are checked first, before any secret is generated or
 * any store is opened, and no `.env` file is loaded. The data tree is checked
 * too (ISO-1, config/isolated-tree.ts): no symlink, foreign owner or
 * group/world-writable entry anywhere under the root.
 */

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { bootstrapSecrets, SecretsBootstrapError } from './secrets-bootstrap.js';
import { checkIsolatedServerEnv, ISOLATED_ENV } from './isolation.js';
import { checkIsolatedTree } from './isolated-tree.js';
import { existsSync } from 'node:fs';
import { dataRoot } from './data-root.js';
import { applyPendingRestore, RESTORE_MARKER } from '../services/backups.js';

if (process.env[ISOLATED_ENV] === '1') {
  // src/config (or dist/config) -> packages/backend -> packages -> repo root.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  const errors = checkIsolatedServerEnv(process.env, { repoRoot, homeDirs: [os.userInfo().homedir] }, process.cwd());
  // ISO-1: the data tree (root, parents, every store path) before any secret or DB open.
  if (!errors.length) errors.push(...checkIsolatedTree(path.resolve(process.env.AGENT_PLAYER_DATA_DIR!)));
  if (errors.length) {
    for (const e of errors) console.error(`FATAL (isolated mode): ${e}`);
    process.exit(1);
  }
} else {
  loadDotenv({ quiet: true });
}

// BACKUP-01: a restore asked for before the last stop is put in place now, before any store opens.
if (existsSync(path.join(dataRoot(), RESTORE_MARKER))) {
  const done = await applyPendingRestore();
  if (done) console.log(done.ok ? `[Backups] Restored backup ${done.id}` : `[Backups] Restore of ${done.id} failed: ${done.error}`);
}

try {
  bootstrapSecrets();
} catch (err) {
  if (err instanceof SecretsBootstrapError) {
    console.error(`FATAL: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
