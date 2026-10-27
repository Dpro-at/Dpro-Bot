// CHAT-BUILD-01 stage 2 (CH9): which sections the chat sidebar shows and in what order.
// Per person (saved by the backend); Reset restores Girru's order. Agents never change it.
import type { UiIconName } from './ui-icons';

export type ChatSection = 'scheduled' | 'running' | 'pinned' | 'projects' | 'other' | 'archived';
export const CHAT_SECTIONS: readonly { id: ChatSection; name: string; note: string; icon: UiIconName }[] = [
  { id: 'scheduled', name: 'Scheduled', note: 'Chats that run on a schedule · next run', icon: 'clock' },
  { id: 'running', name: 'Running now', note: 'Chats where someone is working', icon: 'pulse' },
  { id: 'pinned', name: 'Pinned', note: 'Chats you keep on top', icon: 'pin' },
  { id: 'projects', name: 'Projects', note: 'Each project and its chats', icon: 'folder' },
  { id: 'other', name: 'Other chats', note: 'Chats without a project', icon: 'message' },
  { id: 'archived', name: 'Archived', note: 'Old chats, still searchable', icon: 'archive' },
];
export type SidebarPrefs = { order: ChatSection[]; hidden: ChatSection[]; folded: string[] };
export const DEFAULT_PREFS: SidebarPrefs = { order: CHAT_SECTIONS.map(s => s.id), hidden: ['archived'], folded: [] };
const ids = new Set<string>(CHAT_SECTIONS.map(s => s.id));

/** A saved value made whole: unknown ids dropped, missing sections added at the end. */
export function readPrefs(raw: unknown): SidebarPrefs {
  let v: unknown = raw;
  if (typeof raw === 'string') { try { v = JSON.parse(raw); } catch { return DEFAULT_PREFS; } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return DEFAULT_PREFS;
  const o = v as Record<string, unknown>;
  const isSection = (x: unknown): x is ChatSection => typeof x === 'string' && ids.has(x);
  const unique: ChatSection[] = [...new Set((Array.isArray(o.order) ? o.order as unknown[] : []).filter(isSection))];
  for (const s of DEFAULT_PREFS.order) if (!unique.includes(s)) unique.push(s);
  const hidden: ChatSection[] = Array.isArray(o.hidden) ? [...new Set((o.hidden as unknown[]).filter(isSection))] : DEFAULT_PREFS.hidden;
  const folded: string[] = [...new Set((Array.isArray(o.folded) ? o.folded as unknown[] : []).filter((x): x is string => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(x)))].slice(0, 200);
  return { order: unique, hidden, folded };
}

/** Moves one section up (-1) or down (+1) in the order. */
export function moveSection(order: readonly ChatSection[], id: ChatSection, by: -1 | 1): ChatSection[] {
  const i = order.indexOf(id), j = i + by;
  if (i < 0 || j < 0 || j >= order.length) return [...order];
  const next = [...order]; [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Short time for a sidebar row: now, 5m, 2h, Mon, Oct 12. */
export function shortTime(updatedAt: string, now: Date = new Date()): string {
  const raw = updatedAt.includes('T') ? updatedAt : `${updatedAt.replace(' ', 'T')}Z`;
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return '';
  const ms = now.getTime() - t.getTime();
  if (ms < 60_000) return 'now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 6 * 86_400_000) return t.toLocaleDateString('en', { weekday: 'short' });
  return t.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
