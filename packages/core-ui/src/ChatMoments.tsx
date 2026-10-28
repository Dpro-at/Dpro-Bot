// CHAT-BUILD-01 stage 5 (CH2, CH6, CH10): the quiet lines and cards in the conversation that make a
// team of agents trustworthy — Allow once / Deny where an agent waits for you, hand-off cards, what you
// said while it worked, text that tried to give orders, the chat summed up, a plan limit, undo what an
// agent changed — and the task list above the box. Each is one sentence and at most one action.
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SessionClient } from './session';
import type { Part, ToolCall, Turn } from './turns';
import { duration, turnPlan } from './turns';
import { UiIcon } from './ui-icons';
import { ContextMenu, useMenu } from './desktop-ui';
import { ApprovalVerificationSheet } from './ApprovalVerificationSheet';
import { paramView, requestTitle } from './ApprovalPage';

export type Moments = {
  client?: SessionClient; conversationId?: string | null; agentName?: (id?: string) => string;
  onSwitchAuto?: () => void; onStartFresh?: (summary: string) => void; onReviewChanges?: () => void; onChanged?: () => void; onOpenApprovals?: () => void; onStop?: () => void;
};
export const MomentsContext = createContext<Moments>({});

/** CH10 Steer now: what the owner said while the agent worked, and the step it was seen at. */
export function SteerLine({ part }: { part: Extract<Part, { kind: 'steer' }> }) {
  return <p className="moment-steer"><UiIcon name="send" size={12}/><span><b>You</b> · seen at step {part.step}</span><span dir="auto">{part.text}</span></p>;
}

/** CH10: notices kept with a reply. */
export function NoticeCard({ part }: { part: Extract<Part, { kind: 'notice' }> }) {
  const m = useContext(MomentsContext);
  const [shown, setShown] = useState(false);
  if (part.code === 'injection') return <div className="moment-card" data-tone="needs" role="note">
    <p><UiIcon name="shield" size={14}/>A page or file asked the agent to do something you did not ask for. Girru ignored it and carried on with your task.</p>
    {part.text && <div className="moment-actions"><button type="button" className="link-button" aria-expanded={shown} onClick={() => setShown(v => !v)}>{shown ? 'Hide the text' : 'Show the text'}</button></div>}
    {shown && part.text && <blockquote dir="auto">{part.text}</blockquote>}
  </div>;
  if (part.code === 'images_not_seen') return <p className="moment-line"><UiIcon name="image" size={12}/>{part.text ?? 'This model does not see images in this chat.'}</p>;
  if (part.code === 'plan_limit' && shown) return <p className="moment-line"><UiIcon name="pulse" size={12}/>Kept the model. It answers again when its plan allows.</p>;
  if (part.code === 'plan_limit') return <div className="moment-card" data-tone="needs" role="note">
    <p><UiIcon name="pulse" size={14}/>{part.text ?? 'The coding app hit its plan limit.'}</p>
    {m.onSwitchAuto && <div className="moment-actions"><button type="button" className="moment-main" onClick={m.onSwitchAuto}>Switch to Auto</button>
      <button type="button" className="link-button" onClick={() => setShown(true)}>Keep this model</button></div>}
  </div>;
  // The first paragraph says what happened; the rest is the summary itself.
  const [head, ...rest] = (part.text ?? 'Older messages were summed up to keep room for the work.').split('\n\n');
  const summary = rest.join('\n\n').trim();
  return <div className="moment-card" role="note">
    <p><UiIcon name="layers" size={14}/>{head} Nothing is deleted; the full history stays in the chat.</p>
    <div className="moment-actions">
      {summary && <button type="button" className="link-button" aria-expanded={shown} onClick={() => setShown(v => !v)}>{shown ? 'Hide the summary' : 'Read the summary'}</button>}
      {m.onStartFresh && <button type="button" className="link-button" onClick={() => m.onStartFresh!(summary || head)}>Start fresh with this summary</button>}
    </div>
    {shown && summary && <blockquote dir="auto" className="moment-summary">{summary}</blockquote>}
  </div>;
}

/** CH1/CH6: an agent waits for you — review what it wants, then Allow once / Deny right in the chat (also in Approvals).
 * The stored request must be this call's tool in this chat; its parameters are shown before Allow once. */
type Detail = { id: string; toolName: string; sessionId?: string; status: string; paramsHash: string; params: unknown; maskedFields?: string[]; verificationRequired?: boolean };
export function ApprovalCard({ call, who }: { call: ToolCall; who?: string }) {
  const { client, conversationId, onOpenApprovals } = useContext(MomentsContext);
  const [state, setState] = useState<'waiting' | 'busy' | 'review' | 'allowed' | 'denied' | 'gone'>('waiting');
  const more = useMenu();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notice, setNotice] = useState('');
  const [verify, setVerify] = useState(false);
  const id = call.approvalId ?? '';
  const send = async (path: string, body?: unknown) => client!.request(body === undefined ? { method: 'POST', path } as never : { method: 'POST', path, body } as never);
  const review = async () => {
    setState('busy'); setNotice('');
    try {
      const d = await client!.request({ method: 'GET', path: `/api/approvals/${id}` } as never);
      const v = (d.body as any)?.approval as Detail | undefined;
      if (d.status !== 200 || !v) { setState('gone'); return; }
      if (v.toolName !== call.name || (conversationId && v.sessionId && v.sessionId !== conversationId)) { setState('gone'); setNotice('This card does not match the request it names. Check it in Approvals.'); return; }
      if (v.status !== 'pending') { setState(v.status === 'denied' ? 'denied' : 'allowed'); return; }
      setDetail(v); setState('review');
    } catch { setState('waiting'); setNotice('No connection. Try again.'); }
  };
  const allow = async (receipt?: string) => {
    if (!detail) return;
    setState('busy');
    try {
      const r = await send(`/api/approvals/${id}/approve`, { paramsHash: detail.paramsHash, ...(receipt ? { verificationReceipt: receipt } : {}) });
      if (r.status === 200) setState('allowed'); else { setState('review'); setNotice('It was not allowed. Open Approvals to check it.'); }
    } catch { setState('review'); setNotice('No connection. Try again.'); }
  };
  // The request is read at once, so its details and Allow once show without an extra step (what is shown is what is allowed).
  useEffect(() => { if (client && id && state === 'waiting' && !detail) void review(); }, [id]);
  const deny = async () => { setState('busy'); try { const r = await send(`/api/approvals/${id}/deny`); setState(r.status === 200 ? 'denied' : 'waiting'); } catch { setState('waiting'); } };
  if (!client || !id) return null;
  const title = requestTitle(call.name, null);
  if (state === 'allowed') return <p className="moment-line"><UiIcon name="check" size={12}/>Allowed: {title}. The chat carries on with the result.</p>;
  if (state === 'denied') return <p className="moment-line"><UiIcon name="close" size={12}/>Denied: {title}. It did not run.</p>;
  if (state === 'gone') return <p className="moment-line">{notice || 'This request is no longer waiting. See Approvals.'}</p>;
  const view = detail ? paramView(detail.params, detail.maskedFields ?? []) : null;
  return <div className="moment-card" data-tone="needs">
    <p><UiIcon name="alert" size={14}/><span><b>{who ?? 'The agent'}</b> wants to: {title}</span></p>
    {view && (view.complete ? <dl className="approval-plain">{view.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd dir="auto">{v}</dd></div>)}</dl>
      : <p className="moment-hint">The full request is too long to show here. Check it in Approvals.</p>)}
    <div className="moment-actions">
      {state === 'review' && view?.complete
        ? <button type="button" className="moment-main" onClick={() => (detail?.verificationRequired ? setVerify(true) : void allow())}>Allow once</button>
        : <button type="button" className="moment-main" disabled={state === 'busy'} onClick={() => void review()}>Review…</button>}
      <button type="button" className="link-button" disabled={state === 'busy'} onClick={() => void deny()}>Deny</button>
      <span className="moment-hint">Also in Approvals</span>
      {onOpenApprovals && <button type="button" className="dk-icon moment-more" aria-label="More for this request" title="More for this request"
        onClick={e => more.at(e, [{ label: 'Open in Approvals', icon: 'open', run: onOpenApprovals }, { label: 'Always allow this… (Approval rules)', icon: 'check', run: onOpenApprovals }])}><UiIcon name="more" size={14}/></button>}
    </div>
    <ContextMenu menu={more.menu} onClose={more.close}/>
    {notice && <p className="moment-hint" role="status">{notice}</p>}
    {verify && detail && <ApprovalVerificationSheet client={client} id={detail.id} paramsHash={detail.paramsHash} toolName={title} onClose={() => setVerify(false)} onApprove={receipt => { setVerify(false); void allow(receipt); }}/>}
  </div>;
}

/** CH6: a part of the work handed to another agent — the ask, then its report. */
export function DelegationCard({ call }: { call: ToolCall }) {
  const { agentName, onStop } = useContext(MomentsContext);
  const [open, setOpen] = useState(false);
  let input: { agent_id?: string; request?: string } = {};
  try { input = JSON.parse(call.input); } catch { /* shown without the ask */ }
  const name = agentName?.(input.agent_id) ?? input.agent_id ?? 'an agent';
  const state = call.running ? 'Working' : call.approvalId ? 'Waits for you' : call.isError ? 'Did not finish' : 'Done';
  return <div className="moment-card handoff" data-tone={call.approvalId ? 'needs' : undefined}>
    {/* CH6: who it went to (face and name), the state and how long on the right. */}
    <p className="handoff-head"><UiIcon name="handoff" size={14}/><span className="handoff-verb">{call.approvalId ? 'Wants to hand to' : 'Handed to'}</span><span className="composer-face" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><b>{name}</b><span className="moment-hint handoff-state">{state}{call.ms && !call.running ? ` · ${duration(call.ms)}` : ''}</span></p>
    {input.request && <p className="handoff-ask" dir="auto">{input.request}</p>}
    {call.running && onStop && <div className="moment-actions"><button type="button" className="link-button" onClick={onStop}><UiIcon name="stop" size={11}/>Stop</button><span className="moment-hint">Stops this chat’s work, the handed part too</span></div>}
    {call.output && !call.approvalId && <><button type="button" className="handoff-fold" aria-expanded={open} onClick={() => setOpen(v => !v)}><span className="caret" aria-hidden="true"><UiIcon name="chevron" size={12}/></span>{`${name}’s report`}</button>
      {open && <div className="handoff-report" dir="auto">{call.output}</div>}</>}
    {call.approvalId && <ApprovalCard call={call} who="The lead"/>}
  </div>;
}

/** CH10 Undo: a reply that changed files offers Review and Undo; afterwards Redo. */
export function ChangesLine({ turn, messageId }: { turn: Turn; messageId: string }) {
  const { client, conversationId, onReviewChanges, onChanged } = useContext(MomentsContext);
  const [undone, setUndone] = useState(turn.changes?.undone ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (turn.changes?.unavailable) return <p className="moment-line changes"><UiIcon name="lock" size={12}/>Undo not available for this folder: its git settings could run a program, so no snapshot was kept.</p>;
  if (!turn.changes?.files || !client || !conversationId) return null;
  const go = async (redo: boolean) => {
    setBusy(true); setError('');
    try {
      const r = await client.request({ method: 'POST', path: `/api/chat/conversations/${conversationId}/messages/${messageId}/undo`, body: redo ? { redo: true } : {} } as never);
      if (r.status === 200) { setUndone(!redo); onChanged?.(); }
      else setError(r.status === 409 ? 'Some of these files changed since, so nothing was undone.' : 'It did not work. Try again.');
    } catch { setError('No connection. Try again.'); }
    setBusy(false);
  };
  const n = turn.changes.files;
  return <div className="moment-line changes">
    <UiIcon name="diff" size={12}/><span>{undone ? `Undone: ${n} ${n === 1 ? 'file is' : 'files are'} back as before.` : `Changed ${n} ${n === 1 ? 'file' : 'files'}`}
      {!undone && turn.changes?.added !== undefined && <> <span className="diff-add">+{turn.changes.added}</span> <span className="diff-del">−{turn.changes.removed}</span></>}{undone ? '' : '.'}</span>
    {!undone && onReviewChanges && <button type="button" className="link-button" onClick={onReviewChanges}>Review</button>}
    <button type="button" className="link-button" disabled={busy} onClick={() => void go(undone)}>{undone ? 'Redo' : 'Undo these changes'}</button>
    {error && <span className="moment-hint" role="alert">{error}</span>}
  </div>;
}

/** CH2: the chat's task list above the box (the latest plan), folded to one line. */
export function TaskList({ turns, who, waits = 0 }: { turns: readonly Turn[]; who?: string; waits?: number }): ReactNode {
  const [open, setOpen] = useState(false);
  const last = [...turns].reverse().find(t => t.role === 'assistant' && turnPlan(t.parts));
  const steps = last ? turnPlan(last.parts) : null;
  if (!steps?.length) return null;
  const done = steps.filter(s => s.status === 'done').length;
  const working = last!.status === 'running' ? steps.find(s => s.status === 'active') ?? steps.find(s => s.status === 'pending') : undefined;
  return <section className="task-list" aria-label="Tasks">
    <button type="button" className="task-head" aria-expanded={open} onClick={() => setOpen(v => !v)}>
      <span className="chat-project-chevron" data-open={open || undefined}><UiIcon name="chevron" size={11}/></span>
      <b>Tasks</b><span>{done} of {steps.length} done</span>{working && <span className="task-now">· {working.title}</span>}
      {/* CH1: approvals of this chat that wait for the owner, in amber. */}
      {waits > 0 && <span className="task-waits">· {waits} {waits === 1 ? 'waits' : 'wait'} for you</span>}</button>
    {open && <ol>{steps.map((s, i) => <li key={i} data-state={s.status}><span className="task-dot" aria-hidden="true">{s.status === 'done' ? <UiIcon name="check" size={10}/> : null}</span><span dir="auto">{s.title}</span>{who && (s === working || s.status === 'done') && <small>{who}</small>}</li>)}</ol>}
  </section>;
}

/** Desktop notification when long work ends while the window is in the back (CH10). */
export function notifyDone(title: string, body: string) {
  try {
    if (typeof document === 'undefined' || document.visibilityState === 'visible' || typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') new Notification(title, { body, silent: false });
    else if (Notification.permission === 'default') void Notification.requestPermission();
  } catch { /* notifications are optional */ }
}
