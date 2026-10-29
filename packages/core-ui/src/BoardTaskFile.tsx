// TASKLOG-01 (board TaskFile): a card's task in its project's task file (.girru/tasks.md).
// On the card: the task number and the logos of the apps that worked on it; the task page
// (BoardTaskPage.tsx) shows the rest and the file itself (TaskFileSheet).
import { useEffect, useRef, useState } from 'react';
import { UiIcon } from './ui-icons';
import { AppMark } from './ChatDetails';
import type { ModelApp } from './ChatDetails';
import type { TaskMark } from './board';

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

/** The task as the file has it, to read and copy. */
export function TaskFileSheet({ text, title, onClose }: { text: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false), dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  return <dialog ref={dialog} className="mcp-sheet board-sheet task-file-sheet" aria-label={title} onKeyDown={e => e.stopPropagation()} onCancel={e => { e.preventDefault(); onClose(); }}>
    <header><h2>{title}</h2><button className="tool" aria-label="Copy the task" title="Copy the task" onClick={() => { void navigator.clipboard?.writeText(text).then(() => setCopied(true), () => undefined); }}><UiIcon name={copied ? 'check' : 'copy'} size={16}/></button><button className="tool" aria-label={`Close ${title}`} onClick={onClose}><UiIcon name="close" size={17}/></button></header>
    <div className="mcp-sheet-body"><pre dir="auto">{text}</pre><p className="fine-print">Change it in the file with any app; the board reads it again by itself.</p></div>
  </dialog>;
}
