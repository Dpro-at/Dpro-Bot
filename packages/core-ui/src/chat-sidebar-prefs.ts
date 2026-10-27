// CHAT-BUILD-01 stage 2 (CH9): which sections the chat sidebar shows and in what order.
// Per person, remembered on this computer; Reset restores Girru's order. Agents never change it.
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
const KEY = 'girru.chat-sidebar.v1';
const ids = new Set<string>(CHAT_SECTIONS.map(s => s.id));

/** Saved choices, cleaned: unknown ids dropped, missing sections added at the end. */
export function readPrefs(raw?: string | null): SidebarPrefs {
  let text = raw;
  if (text === undefined) { try { text = localStorage.getItem(KEY); } catch { text = null; } }
  try {
    const v = JSON.parse(text ?? 'null');
    if (!v || typeof v !== 'object') return DEFAULT_PREFS;
    const isSection = (x: unknown): x is ChatSection => typeof x === 'string' && ids.has(x);
    const order: ChatSection[] = (Array.isArray(v.order) ? v.order as unknown[] : []).filter(isSection);
    const unique: ChatSection[] = [...new Set(order)];
    for (const s of DEFAULT_PREFS.order) if (!unique.includes(s)) unique.push(s);
    const hidden: ChatSection[] = (Array.isArray(v.hidden) ? v.hidden as unknown[] : []).filter(isSection);
    const folded: string[] = (Array.isArray(v.folded) ? v.folded as unknown[] : []).filter((x): x is string => typeof x === 'string' && x.length <= 80).slice(0, 200);
    return { order: unique, hidden: [...new Set(hidden)], folded: [...new Set(folded)] };
  } catch { return DEFAULT_PREFS; }
}
export function savePrefs(p: SidebarPrefs) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* the choice still applies until the window closes */ } }

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
