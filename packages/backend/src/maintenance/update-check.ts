/**
 * Settings › About and updates: is a newer version waiting?
 *
 * A git checkout install compares its branch with the branch it follows.
 * Reading uses local git only (no network): the counts are as fresh as the
 * last look. `check()` runs `git fetch` once, only when the owner asks; the
 * update itself stays the `agent-player update` command (it stops Girru,
 * backs up and can roll back). Other installs only report their version.
 * Remote addresses are never returned (they may hold credentials).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type GitRun = (args: string[], timeoutMs: number) => { code: number; stdout: string };
export type UpdateState = {
  kind: 'git' | 'installed';
  version: string;
  branch: string | null;
  follows: string | null;
  behind: number | null;
  ahead: number | null;
  lookedAt: number | null;
  command: string | null;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const NAME = /^[A-Za-z0-9._/-]{1,200}$/;
const MIN_GAP_MS = 30_000;

export function realGit(root: string): GitRun {
  return (args, timeoutMs) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf-8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    return { code: r.status ?? 1, stdout: (r.stdout ?? '').trim() };
  };
}

function readVersion(root: string): string {
  try { const v = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8')).version; return typeof v === 'string' && /^[0-9A-Za-z.+-]{1,40}$/.test(v) ? v : 'unknown'; } catch { return 'unknown'; }
}

export function createUpdateCheck({ root = ROOT, git = realGit(root), now = Date.now }: { root?: string; git?: GitRun; now?: () => number } = {}) {
  let lastFetch = 0;
  let running: Promise<UpdateState> | null = null;
  const name = (args: string[]) => { const r = git(args, 5000); return r.code === 0 && NAME.test(r.stdout) ? r.stdout : null; };
  function read(): UpdateState {
    const version = readVersion(root);
    const base: UpdateState = { kind: 'installed', version, branch: null, follows: null, behind: null, ahead: null, lookedAt: null, command: null };
    if (!existsSync(path.join(root, '.git')) || git(['rev-parse', '--is-inside-work-tree'], 5000).stdout !== 'true') return base;
    const branch = name(['rev-parse', '--abbrev-ref', 'HEAD']);
    const follows = branch && branch !== 'HEAD' ? name(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']) : null;
    let ahead: number | null = null, behind: number | null = null;
    if (follows) {
      const counts = git(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], 5000).stdout.match(/^(\d+)\s+(\d+)$/);
      if (counts) { ahead = Number(counts[1]); behind = Number(counts[2]); }
    }
    let lookedAt: number | null = null;
    const fetchHead = name(['rev-parse', '--git-path', 'FETCH_HEAD']);
    if (fetchHead) { try { lookedAt = Math.round(statSync(path.resolve(root, fetchHead)).mtimeMs); } catch { lookedAt = null; } }
    return { ...base, kind: 'git', branch: branch === 'HEAD' ? null : branch, follows, ahead, behind, lookedAt, command: 'agent-player update' };
  }
  /** One network look at a time, at most every 30 seconds; returns whether git fetch ran and worked. */
  async function check(): Promise<UpdateState & { looked: boolean }> {
    const state = read();
    if (state.kind !== 'git' || !state.follows) return { ...state, looked: false };
    if (now() - lastFetch < MIN_GAP_MS) return { ...state, looked: false };
    if (!running) running = Promise.resolve().then(() => { lastFetch = now(); return git(['fetch', '--quiet', '--no-tags'], 30_000); }).then(r => ({ ...read(), fetched: r.code === 0 }) as UpdateState & { fetched: boolean }).finally(() => { running = null; });
    const after = await running as UpdateState & { fetched?: boolean };
    const { fetched, ...rest } = after;
    return { ...rest, looked: fetched === true };
  }
  return { read, check };
}

export const updateCheck = createUpdateCheck();
