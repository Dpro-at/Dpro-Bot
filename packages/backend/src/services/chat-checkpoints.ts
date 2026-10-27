/**
 * Undo what an agent changed (CHAT-BUILD-01 stage 5, CH10). Before and after
 * a reply in a git folder, the folder is snapshotted into a git tree through a
 * temporary index (no commit, no change to the real index or branch). Undo
 * puts the files the reply changed back to the "before" tree; Redo to the
 * "after" tree. Either refuses when one of those files changed since.
 */
import { execFile } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { minimalChildEnv } from '../tools/exec-policy.js';

const TREE = /^[0-9a-f]{40,64}$/;
/** git's empty tree: attributes are read from it, so a repository's .gitattributes cannot name a filter program. */
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
export class CheckpointError extends Error {}

/** A project's own git config never makes these calls start a program (fsmonitor, hooks, filters, pagers). */
const SAFE = ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-c', 'core.untrackedCache=false', '-c', 'core.pager=cat', '-c', 'core.attributesFile=/dev/null', '-c', 'diff.external=', '--no-pager'];
/** Files a snapshot never copies into git's object store (keys and secrets that are not ignored). */
const NEVER = ['.env', '.env.*', '*.pem', '*.key', '*.p12', '*.pfx', 'id_rsa*', 'id_ed25519*', 'secrets.env', 'credentials*', '.credentials.json', '.npmrc', '.netrc', '.git-credentials', '.pgpass', 'auth.json'];
function git(folder: string, args: string[], index?: string): Promise<string> {
  return new Promise((resolve, reject) => execFile('git', [...SAFE, ...args], {
    cwd: folder, timeout: 20_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    // No system or global config, no attributes (so no filter or textconv programs).
    env: minimalChildEnv({ ...(index ? { GIT_INDEX_FILE: index } : {}), GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_ATTR_SOURCE: EMPTY_TREE, GIT_ATTR_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' }),
  }, (err, stdout) => (err ? reject(err) : resolve(String(stdout)))));
}
const literal = (p: string) => `:(literal)${p}`;

/** The project folder's files as a git tree, or null when it is not a git folder (or git fails).
 * Only the chosen folder (not the rest of its repository) and never secret-looking files. */
export async function snapshot(folder: string): Promise<string | null> {
  let dir: string | undefined;
  try {
    if ((await git(folder, ['rev-parse', '--is-inside-work-tree'])).trim() !== 'true') return null;
    const top = (await git(folder, ['rev-parse', '--show-toplevel'])).trim();
    const rel = path.relative(realpathSync(top), realpathSync(folder)).split(path.sep).join('/');
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    // A repository that defines its own attributes file inside .git could still name a filter program: no snapshot then.
    try { if (/filter/i.test(readFileSync(path.join(top, '.git', 'info', 'attributes'), 'utf8'))) return null; } catch { /* none */ }
    dir = mkdtempSync(path.join(tmpdir(), 'girru-ckpt-'));
    const index = path.join(dir, 'index');
    // Start from the real index (fast), then add every file git sees in the folder; the real index is never touched.
    try { copyFileSync(path.resolve(top, (await git(top, ['rev-parse', '--git-path', 'index'])).trim()), index); } catch { /* an empty index works too */ }
    const scope = rel || '.';
    await git(top, ['add', '-A', '--', scope, ...NEVER.map((n) => `:(exclude,glob)${rel ? `${rel}/` : ''}**/${n}`)], index);
    const tree = (await git(top, ['write-tree'], index)).trim();
    return TREE.test(tree) ? `${top}\u0000${tree}\u0000${rel}` : null;
  } catch { return null; }
  finally { if (dir) rmSync(dir, { recursive: true, force: true }); }
}

const split = (ckpt: string) => { const [top, tree, rel = ''] = ckpt.split('\u0000'); if (!top || !TREE.test(tree ?? '')) throw new CheckpointError('Bad checkpoint'); return { top, tree, rel }; };

/** Files of the project folder that differ between two snapshots: status A (added), D (deleted) or M. */
export async function changedFiles(before: string, after: string): Promise<{ status: string; path: string }[]> {
  const a = split(before), b = split(after);
  if (a.top !== b.top || a.rel !== b.rel) throw new CheckpointError('Different folders');
  const out = await git(a.top, ['diff', '--no-renames', '--name-status', '-z', a.tree, b.tree, '--', ...(a.rel ? [literal(a.rel)] : [])]);
  const parts = out.split('\u0000').filter(Boolean);
  const files: { status: string; path: string }[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) files.push({ status: parts[i][0], path: parts[i + 1] });
  return files;
}

/** Puts the files changed between `from` and `to` back to `to` (Undo: from=after, to=before). */
export async function restore(from: string, to: string): Promise<number> {
  const files = await changedFiles(to, from);
  if (!files.length) return 0;
  const { top, rel } = split(from);
  const now = await snapshot(rel ? path.join(top, rel) : top);
  if (!now) throw new CheckpointError('The folder is not available');
  const moved = await git(top, ['diff', '--no-renames', '--name-only', '-z', split(from).tree, split(now).tree, '--', ...files.map((f) => literal(f.path))]);
  if (moved.replace(/\u0000/g, '').trim()) throw new CheckpointError('Some of these files changed since; nothing was undone');
  const inside = path.resolve(top, rel);
  for (const f of files) {
    const abs = path.resolve(top, f.path);
    if (abs !== inside && !abs.startsWith(inside + path.sep)) continue;
    // A file the change added (status A between to→from) is removed; the others come back from `to`.
    if (f.status === 'A') { try { unlinkSync(abs); } catch { /* already gone */ } }
    else await git(top, ['restore', `--source=${split(to).tree}`, '--worktree', '--', literal(f.path)]);
  }
  return files.length;
}
