// AG1: what makes an agent, read for the inspector and the list faces
// (personality, specialties, skills, permissions). Owner reads only; one
// cached read per agent until something about it changes.
import { useEffect, useSyncExternalStore } from 'react';
import type { SessionClient } from './session';
import { TEMPLATES_PATH } from './specialty-contract.js';

export type AgentFacts = Readonly<{
  personality: { name: string; linked: boolean } | null;
  specialties: readonly { id: string; name: string; department: string }[];
  inherited: number; extra: number;
  modes: Readonly<Record<string, string>> | null;
}>;
type Entry = { facts?: AgentFacts; face?: string | null; failed?: boolean; loading?: Promise<void> };
const caches = new WeakMap<SessionClient, Map<string, Entry>>();
const listeners = new Set<() => void>();
let tick = 0;
const changed = () => { tick++; listeners.forEach(fn => fn()); };
const cache = (client: SessionClient) => { let c = caches.get(client); if (!c) { c = new Map(); caches.set(client, c); } return c; };
async function get<T>(client: SessionClient, path: string): Promise<T> {
  const r = await client.request({ method: 'GET', path } as never);
  if (r.status !== 200) throw Error('unavailable');
  return r.body as T;
}
type Assigned = { assignment: { linked: boolean; profile: { name: string } } | null };
/** Forget what was read about an agent (after its personality, skills or permissions changed). */
export function forgetFacts(client: SessionClient, agentId?: string) { const c = cache(client); if (agentId) c.delete(agentId); else c.clear(); changed(); }

async function loadFace(client: SessionClient, id: string) {
  const e = cache(client).get(id) ?? {}; cache(client).set(id, e);
  try { const p = await get<Assigned>(client, `/api/personality-library/assigned/${id}`); e.face = p.assignment?.profile.name ?? null; }
  catch { e.face = null; }
  changed();
}
async function loadFacts(client: SessionClient, id: string) {
  const e = cache(client).get(id) ?? {}; cache(client).set(id, e);
  try {
    const [p, t, s, m] = await Promise.all([
      get<Assigned>(client, `/api/personality-library/assigned/${id}`),
      get<{ templates: { id: string; name: string; department: string }[] }>(client, `${TEMPLATES_PATH}/assigned/${id}`),
      get<{ selected: string[] }>(client, `/api/skill-library/agents/${id}`),
      get<{ modes: Record<string, string> }>(client, `/api/agents/${id}/permissions`).catch(() => null),
    ]);
    const configs = await Promise.all(t.templates.map(x => get<{ config?: { primarySkill: string | null; skills: string[] } }>(client, `${TEMPLATES_PATH}/${x.id}`).catch(() => null)));
    const inherited = new Set(configs.flatMap(c => c?.config ? [...(c.config.primarySkill ? [c.config.primarySkill] : []), ...c.config.skills] : []));
    e.face = p.assignment?.profile.name ?? null;
    e.facts = Object.freeze({ personality: p.assignment ? { name: p.assignment.profile.name, linked: p.assignment.linked } : null,
      specialties: t.templates.map(x => ({ id: x.id, name: x.name, department: x.department })),
      inherited: inherited.size, extra: s.selected.filter(x => !inherited.has(x)).length, modes: m?.modes ?? null });
    e.failed = false;
  } catch { e.failed = true; }
  changed();
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const snapshot = () => tick;

/** The facts of one agent (undefined while reading, null when they could not be read). */
export function useAgentFacts(client: SessionClient, agentId: string | undefined, enabled: boolean): AgentFacts | null | undefined {
  const now = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!enabled || !agentId || !client) return;
    const e = cache(client).get(agentId);
    if (!e?.facts && !e?.failed && !e?.loading) { const n = e ?? {}; cache(client).set(agentId, n); n.loading = loadFacts(client, agentId).finally(() => { n.loading = undefined; }); }
  }, [client, agentId, enabled, now]);
  if (!agentId || !client) return undefined;
  const e = cache(client).get(agentId);
  return e?.facts ?? (e?.failed ? null : undefined);
}
/** Each listed agent's personality name for its small face (read once, at most 120 agents). */
export function useFaces(client: SessionClient, agentIds: readonly string[], enabled: boolean): Readonly<Record<string, string | null>> {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const key = agentIds.slice(0, 120).join(',');
  useEffect(() => {
    if (!enabled || !client) return;
    for (const id of agentIds.slice(0, 120)) { const e = cache(client).get(id); if (e?.face === undefined && !e?.loading) { const n = e ?? {}; cache(client).set(id, n); n.loading = loadFace(client, id).finally(() => { n.loading = undefined; }); } }
  }, [client, key, enabled]);
  const out: Record<string, string | null> = {};
  if (!client) return out;
  for (const id of agentIds) { const f = cache(client).get(id)?.face; if (f !== undefined) out[id] = f; }
  return out;
}
/** Retry after an error (the next render reads again). */
export function retryFacts(client: SessionClient, agentId: string) { const e = cache(client).get(agentId); if (e) e.failed = false; changed(); }

const VERB: Record<string, string> = { browser: 'browsing', network: 'going online', message: 'sending', delete: 'deleting', install: 'installing', money: 'spending', settings: 'changing settings' };
/** "Asks before sending, deleting, installing" in plain words. */
export function permissionLine(modes: Readonly<Record<string, string>> | null): string {
  if (!modes) return 'Could not be read';
  const ask = Object.keys(VERB).filter(c => modes[c] === 'ask').map(c => VERB[c]);
  const never = Object.keys(VERB).filter(c => modes[c] === 'off').length;
  if (!ask.length) return never ? `Never: ${Object.keys(VERB).filter(c => modes[c] === 'off').map(c => VERB[c]).join(', ')}` : 'Works on its own';
  return `Asks before ${ask.slice(0, 4).join(', ')}${ask.length > 4 ? '…' : ''}`;
}
