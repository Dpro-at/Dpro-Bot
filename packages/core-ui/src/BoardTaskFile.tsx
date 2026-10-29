// TASKLOG-01 (board TaskFile): a card's task in its project's task file (.girru/tasks.md).
// On the card: the task number and the logos of the apps that worked on it. In the card
// panel: where it lives, who worked on it, Done / Left / Next, the last log lines, and
// Continue (a new chat in the project where the chosen agent and app go on with it).
import { useEffect, useRef, useState } from 'react';
import { UiIcon } from './ui-icons';
import { AppMark } from './ChatDetails';
import type { ModelApp } from './ChatDetails';
import type { BoardController, Card, TaskMark } from './board';

/** The mark of an app as the file names it (Claude Code, Codex, Gemini or Antigravity; Girru's own agents sign as Girru). */
export function appOf(name: string): ModelApp | null {
  const n = name.trim().toLowerCase();
  if (n === 'claude code' || n === 'claude') return { id: 'subscription:claude', name: 'Claude Code' };
  if (n === 'codex') return { id: 'subscription:codex', name: 'Codex' };
  if (n === 'gemini' || n === 'antigravity') return { id: 'subscription:gemini', name: 'Gemini' };
  return null;
}
export function AppLogo({ name, size = 12 }: { name: string; size?: number }) {
  const app = appOf(name);
  return <span className="task-app" title={name} aria-label={name}>{app ? <AppMark app={app} size={size}/> : <UiIcon name="sparkle" size={size}/>}</span>;
}

/** On a card: the task number (a warning when its block breaks the format) and the apps' logos. */
export function TaskFileMark({ mark }: { mark: TaskMark }) {
  return <span className={`task-file-mark${mark.problem ? ' needs-you' : ''}`} title={mark.problem ? `${mark.no} in the task file of ${mark.projectName}: ${mark.problem}. Fix that line in .girru/tasks.md.` : `${mark.no} in the task file of ${mark.projectName} (.girru/tasks.md)`}>
    <UiIcon name={mark.problem ? 'alert' : 'file'} size={11}/>{mark.no}
    {mark.apps.length > 0 && <span className="task-apps">{mark.apps.slice(0, 4).map(a => <AppLogo key={a} name={a} size={11}/>)}</span>}
  </span>;
}

const APPS: ReadonlyArray<{ model: string; name: string }> = [
  { model: '', name: 'Its own model' }, { model: 'subscription:claude', name: 'Claude Code' }, { model: 'subscription:codex', name: 'Codex' }, { model: 'subscription:gemini', name: 'Gemini' },
];

/** In the card panel: the task as the file has it, and Continue. */
export function TaskFileSection({ card, controller, busy, onOpenChat }: { card: Card; controller: BoardController; busy: boolean; onOpenChat?: (id: string) => void }) {
  const s = controller.getSnapshot(), t = s.task, mark = card.taskFile!;
  const d = t?.phase === 'ready' ? t.detail : null;
  const lastApp = d?.log[0]?.app ?? d?.workedOn.at(-1)?.app ?? '';
  const [agent, setAgent] = useState(card.agents[0] ?? ''), [model, setModel] = useState(''), [picked, setPicked] = useState(false);
  // Until the owner picks, the app is the one that worked on the task last.
  useEffect(() => { if (!picked) setModel(APPS.find(a => a.model && appOf(lastApp)?.id === a.model)?.model ?? ''); }, [lastApp, picked]);
  const [showFile, setShowFile] = useState(false), [dept, setDept] = useState('');
  // A task no department fitted waits in To sort on the company board; the owner sends it on.
  const toSort = s.columns.find(c => c.id === card.columnId)?.name === 'To sort';
  const sortable = [...new Set(s.boards.filter(b => b.kind === 'department' && b.departmentActive !== false).map(b => b.departments[0]).filter(Boolean))].sort();
  const agents = [...s.agents].sort((a, b) => Number(card.agents.includes(b.id)) - Number(card.agents.includes(a.id)));
  const list = (title: string, items: readonly string[]) => items.length > 0 && <div className="task-file-part"><h4>{title}</h4><ul>{items.map((x, i) => <li key={i} dir="auto">{x}</li>)}</ul></div>;
  return <section className="task-file" aria-label="Task file">
    <header>
      <h3><UiIcon name="file" size={15}/>Task file</h3>
      <span className="fine-print" title={`${d?.file ?? '.girru/tasks.md'} in the folder of project ${mark.projectName}`}>{mark.no} in {d?.file ?? '.girru/tasks.md'} · project {mark.projectName}</span>
      <button type="button" className="tool" aria-label="Show it in the file" title="Show it in the file" disabled={!d} onClick={() => setShowFile(true)}><UiIcon name="open" size={14}/></button>
      <button type="button" className="tool" aria-label="Read the task file again" title="Read the task file again" onClick={() => controller.refreshTask()}><UiIcon name="refresh" size={14}/></button>
    </header>
    {mark.problem && <p className="task-file-problem" role="status"><UiIcon name="alert" size={13}/>{mark.problem}. Fix that line in the file; Girru leaves this task alone until then.</p>}
    {t?.phase === 'loading' && <p className="fine-print" role="status">Reading the task file…</p>}
    {t?.phase === 'error' && <p className="fine-print" role="status">The task file could not be read. Try again with the refresh button.</p>}
    {d && <>
      {d.workedOn.length > 0 && <div className="task-file-part"><h4>Worked on by</h4><ul className="task-worked">{d.workedOn.map(w => <li key={w.app}>
        <AppLogo name={w.app} size={14}/><span><strong>{w.app}</strong>{w.agent && <> for {w.agent}</>}<small>{[w.at ?? w.date, w.what].filter(Boolean).join(' · ')}</small></span>
      </li>)}</ul></div>}
      {list('Done', d.task.done)}{list('Left', d.task.left)}{list('Next', d.task.next)}
      {d.log.length > 0 && <details className="task-file-part"><summary>Log <small>last {d.log.length} · all in the file</small></summary><ul>{d.log.map((l, i) => <li key={i} dir="auto"><small>{l.at} · {l.app}</small> {l.what}</li>)}</ul></details>}
      {!d.workedOn.length && !d.task.done.length && !d.task.left.length && !d.task.next.length && <p className="fine-print">{toSort ? 'No department fitted this task. Send it to one; then any agent can continue it.' : 'Nobody worked on it yet. Continue starts it.'}</p>}
    </>}
    {toSort && sortable.length > 0 && <div className="task-file-continue">
      <label><span className="sr-only">Department</span><select aria-label="Send to department" value={dept} disabled={busy} onChange={e => setDept(e.target.value)}><option value="">Department…</option>{sortable.map(x => <option key={x}>{x}</option>)}</select></label>
      <button type="button" disabled={busy || !dept} title="Put the task on that department’s board, with its lead, and write it in the file" onClick={() => void controller.sortTask(dept)}><UiIcon name="move" size={13}/>Send</button>
    </div>}
    {!mark.finished && !toSort && <div className="task-file-continue">
      <label><span className="sr-only">Agent who continues</span><select aria-label="Agent who continues" value={agent} disabled={busy} onChange={e => setAgent(e.target.value)}>{!agent && <option value="">Main agent</option>}{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label><span className="sr-only">App it uses</span><select aria-label="App it uses" value={model} disabled={busy} onChange={e => { setPicked(true); setModel(e.target.value); }}>{APPS.map(a => <option key={a.model} value={a.model}>{a.name}</option>)}</select></label>
      <button type="button" disabled={busy || !!mark.problem} title={mark.problem ? 'Fix the task’s line in the file first' : 'A new chat in the project: the agent reads Done, Left and Next, works, and writes them back'} onClick={() => void controller.continueTask(agent || undefined, model || undefined).then(id => { if (id) onOpenChat?.(id); })}><UiIcon name="play" size={13}/>Continue</button>
    </div>}
    {showFile && d && <TaskFileSheet text={d.text} title={`${mark.no} in ${d.file}`} onClose={() => setShowFile(false)}/>}
  </section>;
}

function TaskFileSheet({ text, title, onClose }: { text: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false), dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  return <dialog ref={dialog} className="mcp-sheet board-sheet task-file-sheet" aria-label={title} onKeyDown={e => e.stopPropagation()} onCancel={e => { e.preventDefault(); onClose(); }}>
    <header><h2>{title}</h2><button className="tool" aria-label="Copy the task" title="Copy the task" onClick={() => { void navigator.clipboard?.writeText(text).then(() => setCopied(true), () => undefined); }}><UiIcon name={copied ? 'check' : 'copy'} size={16}/></button><button className="tool" aria-label={`Close ${title}`} onClick={onClose}><UiIcon name="close" size={17}/></button></header>
    <div className="mcp-sheet-body"><pre dir="auto">{text}</pre><p className="fine-print">Change it in the file with any app; the board reads it again by itself.</p></div>
  </dialog>;
}
