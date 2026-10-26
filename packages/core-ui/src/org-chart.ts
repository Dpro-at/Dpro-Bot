import type { PublicAgent } from './agents';

/**
 * OC1–OC2: the org chart as positions on a plane. The backend says who each
 * agent's manager is (`manager`, `placed`); this only draws it:
 *  - the main agent on top, the agents right under it side by side;
 *  - everyone deeper stacked under them, one step in per level (like a
 *    file tree), sub-agents with a dashed line;
 *  - a folded agent hides the agents under it and shows their faces instead;
 *  - a search unfolds the way to every match.
 */
export const CARD_W = 204, ROOT_W = 236, CARD_H = 56, SUB_H = 46, GAP_X = 36, INDENT = 22, PAD = 24, STEP = 12;

export type ChartNode = {
  agent: PublicAgent; x: number; y: number; w: number; h: number; depth: number;
  sub: boolean; folded: boolean; hidden: readonly PublicAgent[]; kids: number; match: boolean;
};
/**
 * A connector from a manager to one agent under it. `down`: from above to the
 * top of the card, with the turn at `bend` (y); `side`: from the rail beside
 * a stacked list into the card's left edge.
 */
export type ChartLink = { from: [number, number]; to: [number, number]; kind: 'down' | 'side'; bend: number; dashed: boolean };
/** A department's column in the By department view (its band and header are a drop target). */
export type ChartGroup = { department: string | null; x: number; y: number; w: number; h: number };
export type Chart = { nodes: ChartNode[]; links: ChartLink[]; width: number; height: number; groups?: ChartGroup[] };
/** How the chart is arranged: by who reports to whom, or one column per department. */
export type ChartMode = 'reports' | 'departments';
/** The three ways to draw the lines (OC1 Show menu): right angles, curves, straight. */
export type LineStyle = 'elbow' | 'curved' | 'straight';
export const LINE_STYLES: readonly LineStyle[] = ['elbow', 'curved', 'straight'];

/** The SVG path of one connector in the chosen style. */
export function linkPath(l: ChartLink, style: LineStyle): string {
  const [fx, fy] = l.from, [tx, ty] = l.to;
  if (style === 'straight') return `M${fx} ${fy}L${tx} ${ty}`;
  if (l.kind === 'side') return style === 'elbow' ? `M${fx} ${fy}V${ty}H${tx}` : `M${fx} ${fy}C${fx} ${ty} ${fx} ${ty} ${tx} ${ty}`;
  if (style === 'elbow') return `M${fx} ${fy}V${l.bend}H${tx}V${ty}`;
  const dy = (ty - fy) / 2;
  return `M${fx} ${fy}C${fx} ${fy + dy} ${tx} ${ty - dy} ${tx} ${ty}`;
}

const byName = (a: PublicAgent, b: PublicAgent) => Number(b.role === 'manager') - Number(a.role === 'manager') || (a.name ?? '').localeCompare(b.name ?? '');
/** Agents in the chart (the reserved small agent and agents the backend left out are not). */
export const inChart = (a: PublicAgent) => a.placed !== 'none' && a.id !== 'small-local-agent';

/** Every agent under `id` at any depth (sub-agents included). */
export function underOf(id: string, agents: readonly PublicAgent[]): Set<string> {
  const below = new Set<string>(); let grew = true;
  while (grew) { grew = false; for (const a of agents) if (a.manager && (a.manager === id || below.has(a.manager)) && !below.has(a.id)) { below.add(a.id); grew = true; } }
  return below;
}

/** May `dragged` move under `target`? The main agent and sub-agents stay put; no circles; a sub-agent has nobody under it. */
export function canMoveUnder(dragged: PublicAgent | undefined, target: PublicAgent | undefined, agents: readonly PublicAgent[]): boolean {
  if (!dragged || !target || dragged.id === target.id) return false;
  if (!movable(dragged) || target.placed === 'sub' || !inChart(target)) return false;
  if (dragged.manager === target.id) return false;
  return !underOf(dragged.id, agents).has(target.id);
}
export const movable = (a: PublicAgent) => a.placed === 'set' || a.placed === 'auto';

/** `maxWidth`: the visible width; agents under the main agent wrap into rows that fit it (with a trunk on the left). */
export function layoutChart(all: readonly PublicAgent[], folded: ReadonlySet<string>, query = '', maxWidth = Infinity): Chart {
  const agents = all.filter(inChart);
  const ids = new Set(agents.map(a => a.id));
  const kids = new Map<string, PublicAgent[]>();
  const roots: PublicAgent[] = [];
  for (const a of agents) {
    if (a.manager && ids.has(a.manager) && a.manager !== a.id) kids.set(a.manager, [...(kids.get(a.manager) ?? []), a]);
    else roots.push(a);
  }
  // Sub-agents first under their agent, then managers, then by name.
  for (const list of kids.values()) list.sort((a, b) => Number(b.placed === 'sub') - Number(a.placed === 'sub') || byName(a, b));
  roots.sort((a, b) => Number(b.placed === 'main') - Number(a.placed === 'main') || byName(a, b));

  const q = query.trim().toLowerCase();
  const matches = new Set(q ? agents.filter(a => [a.name, a.department, a.description].some(x => x?.toLowerCase().includes(q))).map(a => a.id) : []);
  const byId = new Map(agents.map(a => [a.id, a]));
  // A search opens the folded agents on the way to each match.
  const open = new Set<string>();
  for (const m of matches) { let c = byId.get(m)?.manager; while (c && byId.has(c) && !open.has(c)) { open.add(c); c = byId.get(c)!.manager; } }
  const isFolded = (id: string) => folded.has(id) && !open.has(id) && (kids.get(id)?.length ?? 0) > 0;

  const nodes: ChartNode[] = [], links: ChartLink[] = [];
  const link = (from: [number, number], to: [number, number], kind: ChartLink['kind'], bend: number, dashed: boolean) => links.push({ from, to, kind, bend, dashed });
  const node = (a: PublicAgent, x: number, y: number, w: number, depth: number): ChartNode => {
    const f = isFolded(a.id), list = kids.get(a.id) ?? [];
    const n: ChartNode = { agent: a, x, y, w, h: a.placed === 'sub' ? SUB_H : CARD_H, depth, sub: a.placed === 'sub', folded: f, hidden: f ? list : [], kids: list.length, match: matches.has(a.id) };
    nodes.push(n); return n;
  };
  const depthOf = (id: string): number => isFolded(id) ? 0 : Math.max(0, ...(kids.get(id) ?? []).map(k => 1 + depthOf(k.id)));

  // Stack the agents under `parent` (already placed); returns the y below the last one.
  const stack = (parent: ChartNode, y: number): number => {
    if (parent.folded) return y;
    const list = kids.get(parent.agent.id) ?? [];
    if (!list.length) return y;
    const railX = parent.x + INDENT / 2;
    let cursor = y;
    for (const k of list) {
      const n = node(k, parent.x + INDENT, cursor, parent.w - INDENT, parent.depth + 1);
      link([railX, parent.y + parent.h], [n.x, cursor + n.h / 2], 'side', 0, n.sub);
      cursor = stack(n, cursor + n.h + STEP);
    }
    return cursor;
  };

  const single = roots.length === 1 ? roots[0] : null;
  const columns = single ? (isFolded(single.id) ? [] : kids.get(single.id) ?? []) : roots;
  const widthOf = (c: PublicAgent) => CARD_W + INDENT * depthOf(c.id);
  const oneRow = columns.reduce((sum, c) => sum + widthOf(c) + GAP_X, PAD * 2 - GAP_X) <= maxWidth;
  const top = PAD, mid = (n: ChartNode) => n.x + Math.min(n.w, CARD_W) / 2;
  let bottom = single ? top + CARD_H : PAD, width = CARD_W + PAD * 2;
  if (oneRow || !single) {
    // One row, the main agent centred over it (or several roots side by side).
    const colY = single ? PAD + CARD_H + 56 : PAD;
    let x = PAD;
    const colNodes: ChartNode[] = [];
    for (const c of columns) {
      const n = node(c, x, colY, widthOf(c), 1);
      colNodes.push(n);
      bottom = Math.max(bottom, stack(n, colY + n.h + 24) - STEP);
      x += n.w + GAP_X;
    }
    width = Math.max(x - GAP_X + PAD, width);
    if (single) {
      const r = node(single, Math.max(PAD, Math.round(width / 2 - ROOT_W / 2)), top, ROOT_W, 0);
      if (colNodes.length) {
        const busY = top + CARD_H + 28;
        for (const n of colNodes) link([r.x + ROOT_W / 2, top + CARD_H], [mid(n), colY], 'down', busY, n.sub);
      }
    }
  } else {
    // Many agents under the main agent: rows that fit the window, joined by a trunk on the left.
    node(single, PAD, top, ROOT_W, 0);
    const trunkX = PAD + 16, left = PAD + 40;
    let rowTop = top + CARD_H + 56, i = 0, lastBus = top + CARD_H;
    while (i < columns.length) {
      const busY = rowTop - 28, row: ChartNode[] = [];
      let x = left, rowBottom = rowTop;
      while (i < columns.length && (row.length === 0 || x + widthOf(columns[i]) + PAD <= maxWidth)) {
        const n = node(columns[i], x, rowTop, widthOf(columns[i]), 1);
        row.push(n);
        rowBottom = Math.max(rowBottom, stack(n, rowTop + n.h + 24) - STEP);
        x += n.w + GAP_X; i++;
      }
      // Each row branches off the trunk at its own height, so curved and straight lines never cross a card.
      for (const n of row) link([trunkX, busY], [mid(n), rowTop], 'down', busY, n.sub);
      lastBus = busY;
      width = Math.max(width, x - GAP_X + PAD);
      bottom = Math.max(bottom, rowBottom);
      rowTop = rowBottom + 64;
    }
    link([trunkX, top + CARD_H], [trunkX, lastBus], 'down', lastBus, false);
  }
  return { nodes, links, width, height: bottom + PAD + 40 };
}

/** Keyboard moves in the chart: up to the manager, down to the first agent under it, left/right to the next agent on the same level. */
export function chartStep(chart: Chart, id: string | null, key: string): string | null {
  const here = chart.nodes.find(n => n.agent.id === id) ?? chart.nodes.find(n => n.depth === 0) ?? chart.nodes[0];
  if (!here) return null;
  if (!id) return here.agent.id;
  if (key === 'ArrowUp') return chart.nodes.find(n => n.agent.id === here.agent.manager)?.agent.id ?? here.agent.id;
  if (key === 'ArrowDown') return chart.nodes.find(n => n.agent.manager === here.agent.id)?.agent.id ?? here.agent.id;
  const peers = chart.nodes.filter(n => n.agent.manager === here.agent.manager && n.depth === here.depth);
  const at = peers.indexOf(here);
  if (key === 'ArrowLeft') return peers[Math.max(0, at - 1)]?.agent.id ?? here.agent.id;
  if (key === 'ArrowRight') return peers[Math.min(peers.length - 1, at + 1)]?.agent.id ?? here.agent.id;
  return here.agent.id;
}

export const GROUP_HEAD = 40;
/** May `agent` move to `department` in the By department view? Sub-agents stay with their agent. */
export function canMoveToDepartment(agent: PublicAgent | undefined, department: string | null): boolean {
  return !!agent && agent.placed !== 'sub' && inChart(agent) && (agent.department ?? null) !== department;
}

/**
 * By department: the main agent on top, then one column per department
 * (No department last), managers first, each agent's sub-agents right
 * under it on a dashed line. Columns wrap into rows that fit `maxWidth`.
 */
export function layoutDepartments(all: readonly PublicAgent[], query = '', maxWidth = Infinity): Chart {
  const agents = all.filter(inChart);
  const ids = new Set(agents.map(a => a.id));
  const q = query.trim().toLowerCase();
  const matches = new Set(q ? agents.filter(a => [a.name, a.department, a.description].some(x => x?.toLowerCase().includes(q))).map(a => a.id) : []);
  const subsOf = new Map<string, PublicAgent[]>();
  for (const a of agents) if (a.placed === 'sub' && a.subAgentOf && ids.has(a.subAgentOf)) subsOf.set(a.subAgentOf, [...(subsOf.get(a.subAgentOf) ?? []), a]);
  const main = agents.find(a => a.placed === 'main') ?? null;
  const members = agents.filter(a => a !== main && !(a.placed === 'sub' && a.subAgentOf && ids.has(a.subAgentOf)));
  const byDept = new Map<string, PublicAgent[]>();
  for (const a of members) byDept.set(a.department ?? '', [...(byDept.get(a.department ?? '') ?? []), a]);
  const order = [...byDept.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  const nodes: ChartNode[] = [], links: ChartLink[] = [], groups: ChartGroup[] = [];
  const node = (a: PublicAgent, x: number, y: number, w: number, depth: number): ChartNode => {
    const n: ChartNode = { agent: a, x, y, w, h: a.placed === 'sub' ? SUB_H : CARD_H, depth, sub: a.placed === 'sub', folded: false, hidden: [], kids: 0, match: matches.has(a.id) };
    nodes.push(n); return n;
  };
  let top = PAD, width = CARD_W + PAD * 2;
  if (main) {
    const m = node(main, PAD, top, ROOT_W, 0);
    let y = top + CARD_H + STEP;
    for (const s of subsOf.get(main.id) ?? []) { const n = node(s, PAD + INDENT, y, ROOT_W - INDENT, 1); link([PAD + INDENT / 2, m.y + m.h], [n.x, y + n.h / 2], 'side', 0, true); y += n.h + STEP; }
    top = y + 28;
  }
  const colW = CARD_W + INDENT + 16;
  let x = PAD, rowTop = top, rowBottom = top;
  for (const d of order) {
    if (x > PAD && x + colW + PAD > maxWidth) { x = PAD; rowTop = rowBottom + 32; }
    const list = byDept.get(d)!.sort((a, b) => Number(b.role === 'manager') - Number(a.role === 'manager') || (a.name ?? '').localeCompare(b.name ?? ''));
    let y = rowTop + GROUP_HEAD + 8;
    for (const a of list) {
      const n = node(a, x + 8, y, colW - 16, 1);
      y += n.h + STEP;
      for (const s of subsOf.get(a.id) ?? []) { const c = node(s, x + 8 + INDENT, y, colW - 16 - INDENT, 2); link([x + 8 + INDENT / 2, n.y + n.h], [c.x, y + c.h / 2], 'side', 0, true); y += c.h + STEP; }
    }
    groups.push({ department: d || null, x, y: rowTop, w: colW, h: y - rowTop });
    rowBottom = Math.max(rowBottom, y);
    width = Math.max(width, x + colW + PAD);
    x += colW + GAP_X / 2;
  }
  return { nodes, links, groups, width, height: rowBottom + PAD + 40 };
  function link(from: [number, number], to: [number, number], kind: ChartLink['kind'], bend: number, dashed: boolean) { links.push({ from, to, kind, bend, dashed }); }
}
