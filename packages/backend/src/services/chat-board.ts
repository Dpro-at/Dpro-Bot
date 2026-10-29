/**
 * Chat tasks on the board (CHAT-PRO-02 I step 2).
 *
 * The owner turns the task of a conversation into a board card: the card
 * keeps a link to the conversation, the agents it needs are assigned to it,
 * and the conversation shows the card with its column and recent activity
 * (moves, comments, done). The card shows the agents working on it and their
 * progress in the chat: replies, whether one answers right now, and the
 * newest plan (plan_steps) of each.
 *
 * Owner only, like the board: every read and write checks that the board and
 * the conversation belong to the caller; other ids look missing.
 */

import { addCardTask } from './task-file.js';
import { all, one, sql, type Step } from '../repositories/sql-steps.js';
import { listConversationMessages, type ConversationMessage } from '../repositories/chat-conversations.js';
import { planSteps, type PlanStep } from '../tools/plan/plan-steps.js';
import { BoardError, cardActivity, createCard, type BoardCard, type CardActivity, type Priority, type CardType } from './task-board.js';

/** Activity lines shown per card in the chat. */
export const CHAT_ACTIVITY = 8;
/** Cards one conversation may list. */
export const MAX_CHAT_CARDS = 20;

const bad = (message: string) => new BoardError(400, 'invalid_board', message);
const notFound = (what: string) => new BoardError(404, 'not_found', `${what} not found`);
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export interface ChatCard {
  id: string; boardId: string; boardName: string; title: string; column: string; columnId: string;
  /** In the board's last column. */
  done: boolean; archived: boolean; priority: Priority; type: CardType; agents: string[];
  comments: number; checklist: { done: number; total: number }; createdAt: string; updatedAt: string;
  activity: CardActivity[];
}

export interface AgentProgress {
  agentId: string; replies: number; lastAt: string | null; running: boolean;
  plan: { done: number; total: number; active: string | null; steps: PlanStep[] } | null;
}
export interface ChatProgress { running: boolean; agents: AgentProgress[] }

function* ownedConversation(ownerId: string, conversationId: string): Step<{ id: string; title: string | null; agent_id: string | null }> {
  const c = yield* one<{ id: string; title: string | null; agent_id: string | null }>('SELECT id, title, agent_id FROM chat_sessions WHERE id = ? AND user_id = ?', conversationId, ownerId);
  if (!c) throw notFound('Conversation');
  return c;
}

/**
 * A card on the owner's board made from a conversation. Body: boardId,
 * optional columnId (default: the "To do" column, else the first one), title,
 * description, priority, type, agents.
 */
export async function createChatCard(ownerId: string, conversationId: string, body: Record<string, unknown>): Promise<BoardCard> {
  const k = Object.keys(body).find((x) => !['boardId', 'columnId', 'title', 'description', 'priority', 'type', 'agents'].includes(x));
  if (k) throw bad(`Unknown field "${k.slice(0, 40)}"`);
  if (typeof body.boardId !== 'string' || !ID.test(body.boardId)) throw bad('boardId is required');
  if (body.columnId !== undefined && (typeof body.columnId !== 'string' || !ID.test(body.columnId))) throw bad('columnId must be a column id');
  const boardId = body.boardId;
  const columnId = await sql().read((function* () {
    yield* ownedConversation(ownerId, conversationId);
    const b = yield* one('SELECT id FROM boards WHERE id = ? AND owner_id = ? AND archived = 0', boardId, ownerId);
    if (!b) throw notFound('Board');
    if (typeof body.columnId === 'string') return body.columnId;
    const cols = yield* all<{ id: string; name: string }>('SELECT id, name FROM board_columns WHERE board_id = ? ORDER BY position', boardId);
    if (!cols.length) throw bad('The board has no columns');
    return (cols.find((c) => c.name.trim().toLowerCase() === 'to do') ?? cols[0]).id;
  })());
  const linked = await sql().read(one<{ n: number }>('SELECT COUNT(*) AS n FROM board_cards WHERE conversation_id = ?', conversationId));
  if (Number(linked?.n ?? 0) >= MAX_CHAT_CARDS) throw bad(`A conversation can have at most ${MAX_CHAT_CARDS} cards`);
  const { boardId: _b, ...card } = body;
  const made = await createCard(ownerId, boardId, { ...card, columnId }, { conversationId });
  // TASKLOG-01: a card from a project chat gets a number and a block in the project's task file.
  await addCardTask(made.id, conversationId);
  return made;
}

/** The cards made from a conversation (archived ones too, marked), oldest first, with their recent activity. */
export function conversationCards(ownerId: string, conversationId: string): Promise<ChatCard[]> {
  return sql().read((function* () {
    yield* ownedConversation(ownerId, conversationId);
    const rows = yield* all<{
      id: string; board_id: string; board_name: string; title: string; column_id: string; column_name: string; archived: number; priority: Priority; card_type: CardType;
      created_at: string; updated_at: string; last_column: string | null;
    }>(`SELECT c.id, c.board_id, b.name AS board_name, c.title, c.column_id, col.name AS column_name, c.archived, c.priority, c.card_type, c.created_at, c.updated_at,
          (SELECT x.id FROM board_columns x WHERE x.board_id = c.board_id ORDER BY x.position DESC LIMIT 1) AS last_column
        FROM board_cards c JOIN boards b ON b.id = c.board_id JOIN board_columns col ON col.id = c.column_id
        WHERE c.conversation_id = ? AND b.owner_id = ? ORDER BY c.created_at, c.id LIMIT ${MAX_CHAT_CARDS}`, conversationId, ownerId);
    const out: ChatCard[] = [];
    for (const r of rows) {
      const agents = (yield* all<{ agent_id: string }>('SELECT agent_id FROM board_card_agents WHERE card_id = ? ORDER BY agent_id', r.id)).map((a) => a.agent_id);
      const n = yield* one<{ n: number }>('SELECT COUNT(*) AS n FROM board_card_comments WHERE card_id = ?', r.id);
      const k = yield* one<{ total: number; done: number | null }>('SELECT COUNT(*) AS total, SUM(done) AS done FROM board_card_checklist WHERE card_id = ?', r.id);
      out.push({
        id: r.id, boardId: r.board_id, boardName: r.board_name, title: r.title, column: r.column_name, columnId: r.column_id,
        done: r.last_column === r.column_id, archived: Number(r.archived) === 1, priority: r.priority, type: r.card_type, agents,
        comments: Number(n?.n ?? 0), checklist: { done: Number(k?.done ?? 0), total: Number(k?.total ?? 0) },
        createdAt: r.created_at, updatedAt: r.updated_at, activity: yield* cardActivity(r.id, CHAT_ACTIVITY),
      });
    }
    return out;
  })());
}

/** The newest plan_steps list of a reply, or null. */
export function replyPlan(m: ConversationMessage): PlanStep[] | null {
  let found: PlanStep[] | null = null;
  for (const p of m.parts ?? []) {
    if (p.kind !== 'tools') continue;
    for (const c of p.calls) {
      if (c.name !== 'plan_steps' || c.isError) continue;
      try { const steps = planSteps(JSON.parse(c.input)?.steps); if (Array.isArray(steps)) found = steps; } catch { /* a broken call is not a plan */ }
    }
  }
  return found;
}

/**
 * Who works on the task in the chat and how far they are: every agent that
 * replied or is assigned to the card, its replies, whether it answers right
 * now (`activeAgent`), and its newest plan.
 */
export async function chatProgress(conversationId: string, conversationAgent: string | null, assigned: readonly string[], active: { agentId: string | null; parts?: ConversationMessage['parts'] } | null): Promise<ChatProgress> {
  const primary = (await sql().read(one<{ id: string }>('SELECT id FROM agents_config WHERE is_primary = 1 ORDER BY id LIMIT 1')))?.id ?? null;
  const resolve = (id: string | null | undefined) => id ?? conversationAgent ?? primary;
  const messages = await listConversationMessages(conversationId);
  const byAgent = new Map<string, AgentProgress>();
  const entry = (id: string) => {
    let e = byAgent.get(id);
    if (!e) { e = { agentId: id, replies: 0, lastAt: null, running: false, plan: null }; byAgent.set(id, e); }
    return e;
  };
  for (const id of assigned) entry(id);
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const id = resolve(m.agentId);
    if (!id) continue;
    const e = entry(id);
    e.replies++; e.lastAt = m.createdAt;
    const steps = replyPlan(m);
    if (steps) {
      const active = steps.find((s) => s.status === 'active');
      e.plan = { done: steps.filter((s) => s.status === 'done').length, total: steps.filter((s) => s.status !== 'skipped').length, active: active?.title ?? null, steps };
    }
  }
  const runningAgent = active ? resolve(active.agentId) : null;
  if (runningAgent) {
    const e = entry(runningAgent);
    e.running = true;
    // The reply being written right now: its live plan is the newest.
    const steps = active?.parts ? replyPlan({ parts: active.parts } as ConversationMessage) : null;
    if (steps) { const a = steps.find((s) => s.status === 'active'); e.plan = { done: steps.filter((s) => s.status === 'done').length, total: steps.filter((s) => s.status !== 'skipped').length, active: a?.title ?? null, steps }; }
  }
  return { running: !!active, agents: [...byAgent.values()] };
}

/** The conversation a card came from (when it still exists and is the owner's), for the card panel. */
export function cardConversation(ownerId: string, boardId: string, cardId: string): Promise<{ conversation: { id: string; title: string | null; agentId: string | null } | null; agents: string[] }> {
  return sql().read((function* () {
    const c = yield* one<{ conversation_id: string | null }>(`SELECT c.conversation_id FROM board_cards c JOIN boards b ON b.id = c.board_id
      WHERE c.id = ? AND c.board_id = ? AND b.owner_id = ?`, cardId, boardId, ownerId);
    if (!c) throw notFound('Card');
    const agents = (yield* all<{ agent_id: string }>('SELECT agent_id FROM board_card_agents WHERE card_id = ? ORDER BY agent_id', cardId)).map((a) => a.agent_id);
    if (!c.conversation_id) return { conversation: null, agents };
    const conv = yield* one<{ id: string; title: string | null; agent_id: string | null }>('SELECT id, title, agent_id FROM chat_sessions WHERE id = ? AND user_id = ?', c.conversation_id, ownerId);
    return { conversation: conv ? { id: conv.id, title: conv.title, agentId: conv.agent_id } : null, agents };
  })());
}

/** The conversation's own agent (for chatProgress), owner-checked. */
export function conversationAgent(ownerId: string, conversationId: string): Promise<{ agentId: string | null }> {
  return sql().read((function* () { const c = yield* ownedConversation(ownerId, conversationId); return { agentId: c.agent_id }; })());
}
