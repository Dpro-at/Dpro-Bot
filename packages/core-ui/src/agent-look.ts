// How agents look in the desktop redesign (boards AG1–AG5): a department's
// icon tile, a personality's face colour and the four role words.
import type { UiIconName } from './ui-icons';

export type Tone = { bg: string; fg: string };
const tones: Tone[] = [
  { bg: '#172034', fg: '#9DBBFF' }, { bg: '#11302E', fg: '#6FD3C7' }, { bg: '#2A1F3D', fg: '#C4A5FF' },
  { bg: '#3A1C2A', fg: '#F29BC0' }, { bg: '#33290F', fg: '#F0C27A' }, { bg: '#17301F', fg: '#8FD6B0' },
];
export const NO_DEPARTMENT: Tone = { bg: 'var(--secondary)', fg: 'var(--text-2, var(--muted))' };
const hash = (x: string) => [...x].reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7);

const DEPARTMENT_ICONS: [RegExp, UiIconName][] = [
  [/dev|engineer|software|code|tech|it\b/, 'code'], [/research|science|lab|analys/, 'flask'], [/creative|design|art|brand|content|video/, 'palette'],
  [/market|sales|growth|ads/, 'chart'], [/support|care|help|service/, 'heart'], [/finance|account|money|trad/, 'coin'],
  [/legal|law|complian/, 'scale'], [/educat|school|teach|learn|language/, 'cap'], [/business|operat|manage|office|admin/, 'briefcase'],
  [/people|hr|recruit|team/, 'users'], [/security/, 'shield'], [/phone|call/, 'phone'],
];
/** The icon a department shows in the sidebar, the list and the pickers. */
export function departmentIcon(department?: string | null): UiIconName {
  const d = (department ?? '').toLowerCase();
  if (!d) return 'inbox';
  return DEPARTMENT_ICONS.find(([test]) => test.test(d))?.[1] ?? 'folder';
}
/** A department's tile colours; the same name always gets the same colour. */
export function departmentTone(department?: string | null): Tone {
  return department ? tones[hash(department.toLowerCase()) % tones.length] : NO_DEPARTMENT;
}
/** Tile colours that read well in light and dark: a tint of the tone's colour. */
export function tileStyle(t: Tone): { background: string; color: string } {
  return t === NO_DEPARTMENT ? { background: t.bg, color: t.fg } : { background: `color-mix(in srgb, ${t.fg} 22%, transparent)`, color: `color-mix(in srgb, ${t.fg} 72%, var(--text))` };
}
export const departmentName = (department?: string | null) => department ? department[0].toUpperCase() + department.slice(1) : 'No department';

const FACE: Record<string, string> = { balanced: '#9DBBFF', calm: '#6FD3C7', curious: '#C4A5FF', bold: '#F29BC0', orderly: '#9DBBFF', warm: '#F0B86E', cautious: '#AEB4B9', careful: '#AEB4B9', strict: '#F0C27A', precise: '#9DBBFF', creative: '#F29BC0' };
/** The colour of a personality's small face (its name decides it). */
export function personalityColour(name?: string | null): string {
  if (!name) return '#6E7787';
  const word = name.toLowerCase().split(/[^a-z]+/).find(w => FACE[w]);
  return word ? FACE[word] : tones[hash(name) % tones.length].fg;
}

/** The four roles in the team, in the same words everywhere (Lead is the "main" role). */
export const ROLE_CARDS: { key: 'main' | 'manager' | 'specialist' | 'evaluator'; label: string; text: string; icon: UiIconName }[] = [
  { key: 'main', label: 'Lead', text: 'Runs the team, talks to you first', icon: 'star' },
  { key: 'manager', label: 'Manager', text: 'Splits work, checks the others', icon: 'users' },
  { key: 'specialist', label: 'Specialist', text: 'Does one kind of work very well', icon: 'sparkle' },
  { key: 'evaluator', label: 'Reviewer', text: 'Checks results before you see them', icon: 'shield' },
];
export const roleWord = (role?: string | null) => ROLE_CARDS.find(r => r.key === role)?.label ?? 'No role yet';
