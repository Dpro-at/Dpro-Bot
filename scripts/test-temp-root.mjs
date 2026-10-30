// Preload for the backend and MCP test suites (`node --import <this file> --test ...`).
// Every test process gets its own temp root under the system temp folder and points
// TMPDIR / TMP / TEMP at it, so each `mkdtempSync(join(tmpdir(), ...))` lands inside.
// The root is removed when the process ends, even when a test forgot its own cleanup
// or failed half way. `node --test` passes the preload on to each test file's process,
// so file roots nest inside the runner's root and the runner removes whatever is left.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const startCwd = process.cwd();
const root = mkdtempSync(join(tmpdir(), 'girru-test-'));
process.env.TMPDIR = root;
process.env.TMP = root;
process.env.TEMP = root;

function removeRoot() {
  // A test may have moved into a folder under the root; step out before removing it.
  try { if (process.cwd().startsWith(root)) process.chdir(startCwd); } catch { /* cwd already gone */ }
  try { rmSync(root, { recursive: true, force: true, maxRetries: 3 }); } catch { /* best effort on exit */ }
}

process.on('exit', removeRoot);
