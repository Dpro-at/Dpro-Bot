/**
 * Coding-app work in a chat (CHAT-GAPS-01, Mohamed 2026-10-28): when an agent hands a part
 * to Claude Code, Codex or Gemini (ask_coding_app), the chat's Team shows it as its own row
 * with Stop. Kept in memory only, while it runs; Stop in the chat ends all of them.
 */
import { randomUUID } from 'node:crypto';

export type CodingRunView = { id: string; app: string; agentId: string | null; about: string; startedAt: string };
type CodingRun = CodingRunView & { controller: AbortController };

const runs = new Map<string, Map<string, CodingRun>>();
const ID = /^[a-f0-9]{32}$/;

/** The first line of the request, short, as the row's "what it does". */
const aboutOf = (request: string) => {
  const line = request.split('\n').map(l => l.trim()).find(Boolean) ?? '';
  return line.length > 90 ? `${line.slice(0, 89)}…` : line;
};

/** Registers one coding-app run of a chat; call done() when it ends. */
export function startCodingRun(sessionId: string, app: string, agentId: string | null | undefined, request: string) {
  const run: CodingRun = { id: randomUUID().replace(/-/g, ''), app, agentId: agentId ?? null, about: aboutOf(request), startedAt: new Date().toISOString(), controller: new AbortController() };
  let set = runs.get(sessionId);
  if (!set) runs.set(sessionId, set = new Map());
  set.set(run.id, run);
  return {
    id: run.id,
    signal: run.controller.signal,
    done: () => { const s = runs.get(sessionId); s?.delete(run.id); if (s && !s.size) runs.delete(sessionId); },
  };
}

/** The coding apps working in this chat now (oldest first). */
export function codingRunsFor(sessionId: string): CodingRunView[] {
  return [...(runs.get(sessionId)?.values() ?? [])].map(({ controller: _c, ...view }) => view);
}

/** Stops one coding-app run of this chat; false when it is not running here. */
export function stopCodingRun(sessionId: string, id: unknown): boolean {
  if (typeof id !== 'string' || !ID.test(id)) return false;
  const run = runs.get(sessionId)?.get(id);
  if (!run) return false;
  run.controller.abort();
  return true;
}

/** Stops every coding-app run of this chat; returns how many. */
export function stopCodingRuns(sessionId: string): number {
  const set = runs.get(sessionId);
  if (!set) return 0;
  for (const r of set.values()) r.controller.abort();
  return set.size;
}
