/**
 * RULES-03: the coding apps' own instruction files, from one source (Agents › Rules).
 * In a chat project's folder Girru writes the rules once, to .girru/rules.md:
 *   - CLAUDE.md and GEMINI.md get one line, `@.girru/rules.md` (Claude Code and Gemini CLI load @ imports);
 *   - AGENTS.md gets the rules themselves: Codex has no imports, and Antigravity (Girru's Gemini app)
 *     reads AGENTS.md but does not expand @ lines (checked on its own in a test folder, 2026-10-29).
 * Each part sits between Girru's two markers; everything else in those files stays as it is.
 * Only these four paths, only inside the folder, never through a link. "Private" keeps them
 * out of Git with the folder's own .git/info/exclude (a file Git already tracks is left alone);
 * Girru never commits or pushes. The first write comes only from the owner's button; after
 * that a rule change re-writes the project's files by itself.
 */
import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { q } from '../repositories/sql-steps.js';
import { projectFileRules, ruleLine } from './agent-rules.js';

const run = promisify(execFile);
export type FileMode = 'private' | 'project';
export type FileAction = 'create' | 'add' | 'update' | 'unchanged' | 'tracked' | 'link';
export interface FilePlan { name: string; action: FileAction }
export interface FilesState { projectId: string; folder: string | null; mode: FileMode; written: boolean; upToDate: boolean; files: FilePlan[]; rules: string }
export class RuleFilesError extends Error { constructor(readonly code: 'no_folder' | 'not_found' | 'unsafe', message: string) { super(message); } }

export const SOURCE = '.girru/rules.md';
const START = '<!-- girru:rules · written by Girru from Agents › Rules; change the rules there -->';
const END = '<!-- /girru:rules -->';
const APP_FILES = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'] as const;
const EXCLUDE_START = '# girru:rules (private coding app files)';
const EXCLUDE_END = '# /girru:rules';

/** The one source: the project's rules, numbered, as the apps read them. */
export function rulesText(rules: readonly { text: string; when: string | null }[]): string {
  return `${START}\n# Rules\n\nFollow these rules in every task. A rule that starts with "When" applies only in that case. When two disagree, the later one wins.\n\n${rules.map((r, i) => `${i + 1}. ${ruleLine(r)}`).join('\n')}\n`;
}
/** The part Girru keeps in an app's file: a pointer to the source, or (AGENTS.md) the rules. */
export function appPart(name: string, rules: string): string {
  return name === 'AGENTS.md' ? `${START}\n${rules.slice(START.length + 1).trim()}\n${END}` : `${START}\n@${SOURCE}\n${END}`;
}
/** Replace Girru's marked part, or add it at the end; the rest of the file is kept byte for byte. */
export function withPart(current: string | null, part: string): string {
  if (current === null || !current.trim()) return `${part}\n`;
  const a = current.indexOf(START), b = current.indexOf(END, a < 0 ? 0 : a);
  if (a >= 0 && b > a) return current.slice(0, a) + part + current.slice(b + END.length);
  return `${current.replace(/\s*$/, '')}\n\n${part}\n`;
}

async function folderOf(projectId: string): Promise<string> {
  const p = await q.one<{ folder: string | null }>('SELECT folder FROM chat_projects WHERE id = ?', projectId);
  if (!p) throw new RuleFilesError('not_found', 'Project not found');
  if (!p.folder) throw new RuleFilesError('no_folder', 'This project has no folder');
  const real = await fs.realpath(p.folder).catch(() => null);
  if (!real || !(await fs.stat(real)).isDirectory()) throw new RuleFilesError('no_folder', 'The project folder is not there');
  return real;
}
/** null = missing; 'link' = a link or not a plain file (never written through). Opened once without
 * following links, then checked and read through the same handle, so it cannot change in between. */
async function readPlain(file: string): Promise<string | null | 'link'> {
  let fh: Awaited<ReturnType<typeof fs.open>>;
  try { fh = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW | (constants.O_NONBLOCK ?? 0)); } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    if (code === 'ELOOP' || code === 'EMLINK' || code === 'ENXIO' || code === 'EISDIR') return 'link';
    throw err;
  }
  try {
    if (!(await fh.stat()).isFile()) return 'link';
    return await fh.readFile('utf8');
  } finally { await fh.close(); }
}
async function git(folder: string, ...args: string[]): Promise<string | null> {
  try { return (await run('git', ['-C', folder, ...args], { timeout: 10_000 })).stdout.trim(); } catch { return null; }
}
async function tracked(folder: string, name: string): Promise<boolean> {
  return (await git(folder, 'ls-files', '--error-unmatch', '--', name)) !== null;
}
async function writeAtomic(file: string, text: string): Promise<void> {
  const tmp = `${file}.girru-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, text, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
  await fs.rename(tmp, file);
}

async function settings(projectId: string): Promise<{ mode: FileMode; written: boolean }> {
  const r = await q.one<{ mode: string; written_at: string | null }>('SELECT mode, written_at FROM agent_rule_files WHERE project_id = ?', projectId);
  return { mode: r?.mode === 'project' ? 'project' : 'private', written: !!r?.written_at };
}

/** What writing would do now, file by file (reads only). */
export async function filesState(projectId: string, modeOverride?: FileMode): Promise<FilesState> {
  const s = await settings(projectId);
  const mode = modeOverride ?? s.mode;
  let folder: string;
  try { folder = await folderOf(projectId); } catch (err) {
    if (err instanceof RuleFilesError && err.code === 'no_folder') return { projectId, folder: null, mode, written: s.written, upToDate: false, files: [], rules: '' };
    throw err;
  }
  const rules = rulesText(await projectFileRules(projectId));
  const files: FilePlan[] = [];
  for (const name of [SOURCE, ...APP_FILES]) {
    const file = path.join(folder, name);
    const cur = await readPlain(file);
    if (cur === 'link') { files.push({ name, action: 'link' }); continue; }
    if (mode === 'private' && cur !== null && await tracked(folder, name)) { files.push({ name, action: 'tracked' }); continue; }
    const next = name === SOURCE ? rules : withPart(cur, appPart(name, rules));
    files.push({ name, action: cur === null ? 'create' : cur === next ? 'unchanged' : name !== SOURCE && !cur.includes(START) ? 'add' : 'update' });
  }
  return { projectId, folder, mode, written: s.written, upToDate: s.written && files.every((f) => f.action === 'unchanged' || f.action === 'tracked' || f.action === 'link'), files, rules };
}

/** Keep (private) or drop (project) Girru's lines in the folder's own Git exclude. */
async function setExclude(folder: string, names: readonly string[], mode: FileMode): Promise<void> {
  const rel = await git(folder, 'rev-parse', '--git-path', 'info/exclude');
  if (!rel) return; // not a Git folder: nothing to keep out
  const file = path.resolve(folder, rel);
  const cur = (await readPlain(file)) ?? '';
  if (cur === 'link') throw new RuleFilesError('unsafe', 'The Git exclude file is a link');
  const a = cur.indexOf(EXCLUDE_START), b = cur.indexOf(EXCLUDE_END, a < 0 ? 0 : a);
  const kept = a >= 0 && b > a ? cur.slice(0, a).replace(/\n*$/, '') + cur.slice(b + EXCLUDE_END.length).replace(/^\n*/, a > 0 ? '\n' : '') : cur;
  const part = mode === 'private' && names.length ? `${EXCLUDE_START}\n${names.map((n) => `/${n}`).join('\n')}\n${EXCLUDE_END}\n` : '';
  const next = part ? `${kept.replace(/\s*$/, '')}${kept.trim() ? '\n' : ''}${part}` : kept;
  if (next === cur) return;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await writeAtomic(file, next);
}

/** Write the project's files (the owner's button, or a rule change after the first write). */
export async function writeFiles(projectId: string, mode?: FileMode): Promise<FilesState> {
  const s = await settings(projectId);
  const m = mode ?? s.mode;
  const folder = await folderOf(projectId);
  const plan = await filesState(projectId, m);
  const dir = path.join(folder, '.girru');
  const st = await fs.lstat(dir).catch(() => null);
  if (st && (st.isSymbolicLink() || !st.isDirectory())) throw new RuleFilesError('unsafe', '.girru in the project folder is a link or a file');
  if (!st) await fs.mkdir(dir, { mode: 0o755 });
  const done: string[] = [];
  for (const f of plan.files) {
    if (f.action === 'link' || f.action === 'tracked') continue;
    const file = path.join(folder, f.name);
    if (path.dirname(path.resolve(file)) !== (f.name === SOURCE ? dir : folder)) throw new RuleFilesError('unsafe', 'Outside the project folder');
    if (f.action !== 'unchanged') {
      const cur = await readPlain(file);
      if (cur === 'link') continue;
      await writeAtomic(file, f.name === SOURCE ? plan.rules : withPart(cur, appPart(f.name, plan.rules)));
    }
    done.push(f.name === SOURCE ? '.girru/' : f.name);
  }
  await setExclude(folder, done, m);
  await q.run("INSERT INTO agent_rule_files(project_id,mode,written_at,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(project_id) DO UPDATE SET mode=excluded.mode, written_at=excluded.written_at, updated_at=CURRENT_TIMESTAMP", projectId, m, new Date().toISOString());
  return filesState(projectId, m);
}

/** After a rule changes: re-write every project the owner already wrote (quietly; a failure waits for the next change). */
export async function syncWrittenProjects(): Promise<void> {
  const rows = await q.all<{ project_id: string }>('SELECT project_id FROM agent_rule_files WHERE written_at IS NOT NULL').catch(() => []);
  for (const r of rows) {
    try { const st = await filesState(r.project_id); if (!st.upToDate && st.folder) await writeFiles(r.project_id); } catch { /* the next change tries again */ }
  }
}
