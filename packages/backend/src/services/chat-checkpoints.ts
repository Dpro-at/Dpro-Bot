/**
 * Undo what an agent changed (CHAT-BUILD-01 stage 5, CH10). Before and after
 * a reply in a git folder, the folder is snapshotted into a git tree through a
 * temporary index (no commit, no change to the real index or branch). Undo
 * puts the files the reply changed back to the "before" tree; Redo to the
 * "after" tree. Either refuses when one of those files changed since.
 */
import { execFile } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { minimalChildEnv } from '../tools/exec-policy.js';

const TREE = /^[0-9a-f]{40,64}$/;
export class CheckpointError extends Error {}

function git(folder: string, args: string[], index?: string): Promise<string> {
  return new Promise((resolve, reject) => execFile('git', args, {
    cwd: folder, timeout: 20_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    env: minimalChildEnv({ ...(index ? { GIT_INDEX_FILE: index } : {}), GIT_OPTIONAL_LOCKS: '0' }),
  }, (err, stdout) => (err ? reject(err) : resolve(String(stdout)))));
}

/** The folder's files as a git tree, or null when it is not a git folder (or git fails). */
export async function snapshot(folder: string): Promise<string | null> {
  let dir: string | undefined;
  try {
    if ((await git(folder, ['rev-parse', '--is-inside-work-tree'])).trim() !== 'true') return null;
    const top = (await git(folder, ['rev-parse', '--show-toplevel'])).trim();
    dir = mkdtempSync(path.join(tmpdir(), 'girru-ckpt-'));
    const index = path.join(dir, 'index');
    // Start from the real index (fast), then add every file git sees; the real index is never touched.
    try { copyFileSync(path.resolve(top, (await git(top, ['rev-parse', '--git-path', 'index'])).trim()), index); } catch { /* an empty index works too */ }
    await git(top, ['add', '-A', '--', '.'], index);
    const tree = (await git(top, ['write-tree'], index)).trim();
    return TREE.test(tree) ? `${top}\u0000${tree}` : null;
  } catch { return null; }
  finally { if (dir) rmSync(dir, { recursive: true, force: true }); }
}

const split = (ckpt: string) => { const [top, tree] = ckpt.split('\u0000'); if (!top || !TREE.test(tree ?? '')) throw new CheckpointError('Bad checkpoint'); return { top, tree }; };

/** Files that differ between two snapshots: status A (added), D (deleted) or M. */
export async function changedFiles(before: string, after: string): Promise<{ status: string; path: string }[]> {
  const a = split(before), b = split(after);
  if (a.top !== b.top) throw new CheckpointError('Different folders');
  const out = await git(a.top, ['diff', '--no-renames', '--name-status', '-z', a.tree, b.tree]);
  const parts = out.split('\u0000').filter(Boolean);
  const files: { status: string; path: string }[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) files.push({ status: parts[i][0], path: parts[i + 1] });
  return files;
}

/** Puts the files changed between `from` and `to` back to `to` (Undo: from=after, to=before). */
export async function restore(from: string, to: string): Promise<number> {
  const files = await changedFiles(to, from);
  if (!files.length) return 0;
  const { top } = split(from);
  const now = await snapshot(top);
  if (!now) throw new CheckpointError('The folder is not available');
  const moved = await git(top, ['diff', '--no-renames', '--name-only', '-z', split(from).tree, split(now).tree, '--', ...files.map((f) => f.path)]);
  if (moved.replace(/\u0000/g, '').trim()) throw new CheckpointError('Some of these files changed since; nothing was undone');
  for (const f of files) {
    const abs = path.resolve(top, f.path);
    if (!abs.startsWith(top + path.sep)) continue;
    // A file the change added (status A between to→from) is removed; the others come back from `to`.
    if (f.status === 'A') { try { unlinkSync(abs); } catch { /* already gone */ } }
    else await git(top, ['restore', `--source=${split(to).tree}`, '--worktree', '--', f.path]);
  }
  return files.length;
}
