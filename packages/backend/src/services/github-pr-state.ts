/**
 * The pull request of a chat project's branch on GitHub (CH8 Results colours):
 * open, merged, closed or draft, and a checks summary. Owner only, read-only:
 * one call for the branch's latest pull request and two for its checks, only
 * for the project's own GitHub repository and branch. Uses the owner's stored
 * GitHub key (credential skill `github`) when there is one, otherwise asks
 * without one (public repositories). The key never leaves this module. Each
 * answer (also "unavailable": offline, rate limited, private without a key)
 * is kept for a minute.
 */
import { getCredentialStorage } from '../credentials/storage.js';
import { githubRepo } from '../repositories/chat-conversations.js';

export type PrState = 'open' | 'merged' | 'closed' | 'draft';
export type ChecksState = 'passing' | 'pending' | 'failing';
export type PullRequest = { number: number; title: string; state: PrState; url: string; checks: ChecksState | null };
/** pr is null when the branch has no pull request; unavailable when GitHub could not be asked. */
export type PrLookup = { pr: PullRequest | null; unavailable?: true };
type Fetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; url?: string; json(): Promise<unknown> }>;

export const PR_CACHE_MS = 60_000;
const API = 'https://api.github.com';
const BRANCH = /^[A-Za-z0-9._/-]{1,200}$/;
const cache = new Map<string, { at: number; value: PrLookup }>();
// A renamed repository answers with a redirect: followed, but only within GitHub's API (checked below).
let fetcher: Fetch = (url, init) => fetch(url, { ...init, redirect: 'follow' });
let clock = () => Date.now();

/** Tests only: a fake GitHub and clock (and an empty cache). */
export function setGitHubForTests(f: Fetch | null, now?: () => number) {
  fetcher = f ?? ((url, init) => fetch(url, { ...init, redirect: 'follow' }));
  clock = now ?? (() => Date.now());
  cache.clear();
}

async function githubKey(userId: string): Promise<string | null> {
  try {
    const storage = getCredentialStorage();
    await storage.initialize();
    const rows = (await storage.getByUser(userId)).filter((c) => c.skillId === 'github')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    for (const row of rows) { try { const v = (await storage.decrypt(row)).trim(); if (/^[A-Za-z0-9_.-]{20,255}$/.test(v)) return v; } catch { /* next */ } }
  } catch { /* no store: ask without a key */ }
  return null;
}

const record = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function checksOf(runs: unknown, status: unknown): ChecksState | null {
  const list = record(runs) && Array.isArray(runs.check_runs) ? runs.check_runs.filter(record) : [];
  const statuses = record(status) && Array.isArray(status.statuses) ? status.statuses.filter(record) : [];
  if (!list.length && !statuses.length) return null;
  const bad = new Set(['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure', 'stale']);
  if (list.some((r) => bad.has(String(r.conclusion))) || statuses.some((s) => s.state === 'failure' || s.state === 'error')) return 'failing';
  if (list.some((r) => r.status !== 'completed') || statuses.some((s) => s.state === 'pending')) return 'pending';
  return 'passing';
}

/** The latest pull request of `branch` in `owner/repo`, through the cache. */
export async function lookupPullRequest(userId: string, owner: string, repo: string, branch: string): Promise<PrLookup> {
  if (!/^[A-Za-z0-9-]{1,39}$/.test(owner) || !/^[A-Za-z0-9._-]{1,100}$/.test(repo) || !BRANCH.test(branch) || branch.includes('..')) return { pr: null };
  const key = `${userId}\u0000${owner}/${repo}\u0000${branch}`;
  const hit = cache.get(key);
  if (hit && clock() - hit.at < PR_CACHE_MS) return hit.value;
  const value = await ask(userId, owner, repo, branch);
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: clock(), value });
  return value;
}

async function ask(userId: string, owner: string, repo: string, branch: string): Promise<PrLookup> {
  const token = await githubKey(userId);
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Girru', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const get = async (path: string) => {
    const r = await fetcher(`${API}${path}`, { headers, signal: AbortSignal.timeout(5000) });
    if (!r.ok || (r.url && !r.url.startsWith(`${API}/`))) throw new Error(`github ${r.status}`);
    return r.json();
  };
  const base = `/repos/${owner}/${repo}`;
  try {
    const pulls = await get(`${base}/pulls?state=all&per_page=5&sort=created&direction=desc&head=${encodeURIComponent(`${owner}:${branch}`)}`);
    if (!Array.isArray(pulls)) return { pr: null, unavailable: true };
    // Only a pull request opened from this repository's own branch (not a fork's branch of the same name).
    const fromHere = (x: Record<string, unknown>) => record(x.head) && record(x.head.repo) && record(x.head.repo.owner)
      && String(x.head.repo.owner.login).toLowerCase() === owner.toLowerCase();
    const p = pulls.find((x): x is Record<string, unknown> => record(x) && record(x.head) && x.head.ref === branch && fromHere(x));
    if (!p) return { pr: null };
    const number = p.number, url = p.html_url, sha = record(p.head) ? p.head.sha : null;
    // The link is this pull request on github.com (a renamed repository links under its new name).
    if (!Number.isSafeInteger(number) || (number as number) < 1 || typeof url !== 'string' || !new RegExp(`^https://github\\.com/[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}/pull/${number}$`).test(url)) return { pr: null, unavailable: true };
    const state: PrState = p.merged_at ? 'merged' : p.state === 'closed' ? 'closed' : p.draft === true ? 'draft' : 'open';
    let checks: ChecksState | null = null;
    if (typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha)) {
      const [runs, status] = await Promise.all([get(`${base}/commits/${sha}/check-runs?per_page=100`).catch(() => null), get(`${base}/commits/${sha}/status`).catch(() => null)]);
      checks = checksOf(runs, status);
    }
    return { pr: { number: number as number, title: String(p.title ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 200), state, url, checks } };
  } catch {
    return { pr: null, unavailable: true };
  }
}

/** The project's branch and GitHub repository from its git state, then the lookup. */
export async function projectPullRequest(userId: string, git: { branch: string | null; remote: string | null; defaultBranch?: string | null }): Promise<PrLookup> {
  const gh = githubRepo(git.remote);
  if (!gh || !git.branch || git.branch === 'HEAD') return { pr: null };
  // The default branch is where pull requests land, not one of them: an old PR from it would mislead.
  if (git.branch === (git.defaultBranch ?? (['main', 'master'].includes(git.branch) ? git.branch : null))) return { pr: null };
  return lookupPullRequest(userId, gh.owner, gh.repo, git.branch);
}
