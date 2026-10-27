import {ProjectFolderPicker} from './ProjectFolderPicker';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { ConversationsController, Conversation } from './conversations';
import type { ChatSearchController, ChatSearchState } from './chat-search';
import { validQuery } from './chat-search-contract.js';
import { SearchResults } from './ChatSearch';
import { UiIcon } from './ui-icons';
import { ContextMenu, Notice, useMenu } from './desktop-ui';
import type { MenuItem } from './desktop-ui';
import { CHAT_SECTIONS, DEFAULT_PREFS, moveSection, shortTime } from './chat-sidebar-prefs';
import type { ChatSection, SidebarPrefs } from './chat-sidebar-prefs';

/** Today / Yesterday / Previous 7 days / Older, by last activity (newest first). */
export function dateGroups<T extends { updatedAt: string }>(items: readonly T[], now: Date = new Date()): [string, T[]][] {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = day(now);
  const groups = new Map<string, T[]>();
  for (const c of items) {
    const raw = c.updatedAt.includes('T') ? c.updatedAt : `${c.updatedAt.replace(' ', 'T')}Z`;
    const t = new Date(raw); const d = Number.isNaN(t.getTime()) ? today : day(t);
    const label = d >= today ? 'Today' : d >= today - 86_400_000 ? 'Yesterday' : d >= today - 7 * 86_400_000 ? 'Previous 7 days' : 'Older';
    groups.set(label, [...(groups.get(label) ?? []), c]);
  }
  return ['Today', 'Yesterday', 'Previous 7 days', 'Older'].filter(l => groups.has(l)).map(l => [l, groups.get(l)!]);
}

const noSearch = () => () => {};
const idleSearch = (): ChatSearchState => ({ query: '', phase: 'idle', results: [], truncated: false });
type Chat = Conversation & { schedule?: { next?: string } };

/**
 * CHAT-BUILD-01 stage 2 (CH1, CH9): the chat sidebar holds only chats, as
 * plain names. Sections (Scheduled · Running now · Pinned · Projects · Other
 * chats · Archived) show only when they have chats; the person hides or
 * reorders them in Edit (remembered on this computer). A project is a grey
 * folder with its chats; chats an agent opened sit under their chat on a
 * guide line. Status shows only when there is something: a moving dot while
 * someone works, an amber number when approvals wait for the owner.
 * Row actions are on right-click (or the menu key).
 */
export function ConversationList({ controller, onOpen, search, onNewChat }: { controller: ConversationsController; onOpen: () => void; search?: ChatSearchController; onNewChat?: () => void }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const found = useSyncExternalStore(search ? search.subscribe : noSearch, search ? search.getSnapshot : idleSearch, search ? search.getSnapshot : idleSearch);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<{ id: string | null } | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; undo: boolean; chat: string } | null>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const menu = useMenu();
  const prefs = s.sidebar;
  const setPrefs = (p: SidebarPrefs) => void controller.saveSidebar(p);
  useEffect(() => { if (s.access !== 'denied') void controller.loadSidebar(); }, [controller, s.access]);
  const q = query.trim().toLowerCase();
  // CHAT-PRO-02 D: 2+ characters search inside the chats (titles, your messages, agent replies) on the server.
  const searching = !!search && validQuery(query.trim());
  const type = (text: string) => { setQuery(text); search?.setQuery(text, null); };
  // ⌘F (Ctrl+F) searches the chats; ⌘N (Ctrl+N) starts a new chat.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'f' && searchBox.current?.offsetParent !== null) { e.preventDefault(); searchBox.current?.focus(); }
      else if (k === 'n' && onNewChat && searchBox.current?.offsetParent !== null) { e.preventDefault(); onNewChat(); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [onNewChat]);
  const openHit = (id: string, messageId: string | null) => { void controller.openAt(id, messageId); onOpen(); };
  const projectName = (id: string | null) => (id ? s.projects.find(p => p.id === id)?.name ?? null : null);
  const chats = s.conversations as readonly Chat[];
  const view = useMemo(() => sections(chats, s.projects.map(p => p.id), q), [chats, s.projects, q]);

  const open = (c: Chat) => { void controller.open(c.id); onOpen(); };
  const archive = async (c: Chat, archived: boolean) => {
    if (await controller.archive(c.id, archived)) setToast({ id: Date.now(), text: archived ? 'Chat archived.' : 'Chat brought back.', undo: true, chat: c.id });
  };
  const rowItems = (c: Chat): MenuItem[] => [
    { label: 'Open', icon: 'message', run: () => open(c) },
    { label: 'Rename', icon: 'pencil', run: () => setRenaming(c.id) },
    { label: c.pinned ? 'Unpin' : 'Pin', icon: 'pin', run: () => void controller.pin(c.id, !c.pinned) },
    ...(s.projects.length ? ['sep' as const, ...[{ id: '', name: 'No project' }, ...s.projects].map(p => ({ label: p.id ? `Move to ${p.name}` : 'Move out of the project', icon: 'folder' as const, checked: (c.projectId ?? '') === p.id, run: () => void controller.moveToProject(c.id, p.id) }))] : []),
    'sep',
    { label: 'Export as Markdown', icon: 'download', run: () => void controller.exportMarkdown(c.id) },
    { label: c.archived ? 'Bring back from the archive' : 'Archive', icon: 'archive', run: () => void archive(c, !c.archived) },
    { label: 'Delete…', icon: 'trash', danger: true, run: () => setConfirmDelete(c.id) },
  ];
  const projectItems = (p: { id: string; name: string; folder?: string | null }): MenuItem[] => [
    { label: 'New chat here', icon: 'compose', run: () => { controller.filterProject(p.id); controller.newChat(); onOpen(); } },
    { label: prefs.folded.includes(p.id) ? 'Unfold' : 'Fold', icon: 'chevron', run: () => fold(p.id) },
    { label: 'Rename, folder or repo…', icon: 'pencil', run: () => setProjectForm({ id: p.id }) },
  ];
  const sectionItems: MenuItem[] = [{ label: 'Edit sidebar…', icon: 'sliders', run: () => setEditing(true) }];
  const fold = (id: string) => setPrefs({ ...prefs, folded: prefs.folded.includes(id) ? prefs.folded.filter(x => x !== id) : [...prefs.folded, id] });
  const keyMenu = (e: ReactKeyboardEvent, items: MenuItem[]) => { if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') menu.at(e, items); };

  const row = (c: Chat, child = false) => renaming === c.id
    ? <form key={c.id} className="chat-row editing" onSubmit={e => { e.preventDefault(); const v = new FormData(e.currentTarget).get('name'); void controller.rename(c.id, String(v ?? '')); setRenaming(null); }}>
      <input autoFocus name="name" aria-label="Chat name" defaultValue={c.title ?? ''} maxLength={120} onBlur={() => setRenaming(null)} onKeyDown={e => { if (e.key === 'Escape') setRenaming(null); }}/>
    </form>
    : confirmDelete === c.id
      ? <div key={c.id} className="chat-row confirm" role="alert">Delete “{title(c)}” for good?
        <button type="button" className="link-button danger" onClick={() => { setConfirmDelete(null); void controller.remove(c.id); }}>Delete</button>
        <button type="button" className="link-button" autoFocus onClick={() => setConfirmDelete(null)}>Keep</button></div>
      : <button key={c.id} type="button" className="chat-row" data-child={child || undefined} aria-current={c.id === s.activeId ? 'true' : undefined} title={title(c)}
        onClick={() => open(c)} onContextMenu={(e: ReactMouseEvent) => menu.at(e, rowItems(c))} onKeyDown={e => keyMenu(e, rowItems(c))}>
        <span className="chat-row-name" dir="auto">{title(c)}</span>
        {(c.running || (c.id === s.activeId && !!s.runId)) && <span className="chat-row-working" title="Working now" aria-label="Working now"/>}
        {c.waiting ? <span className="chat-row-waits" title={`${c.waiting} ${c.waiting === 1 ? 'approval waits' : 'approvals wait'} for you`} aria-label={`${c.waiting} waiting for you`}>{c.waiting}</span> : null}
        <span className="chat-row-time">{c.schedule?.next ?? shortTime(c.updatedAt)}</span>
      </button>;
  const withChildren = (list: readonly Chat[]) => list.flatMap(c => [row(c), ...(view.children.get(c.id) ?? []).map(k => row(k, true))]);
  const title_ = (id: ChatSection) => CHAT_SECTIONS.find(x => x.id === id)!.name;
  const heading = (id: ChatSection) => <p className="chat-section-title" onContextMenu={(e: ReactMouseEvent) => menu.at(e, sectionItems)} onKeyDown={e => keyMenu(e, sectionItems)} tabIndex={-1}>{title_(id)}</p>;
  const shown = prefs.order.filter(id => !prefs.hidden.includes(id));
  // A hidden section that needs the owner still shows a small amber dot on the sidebar edge.
  const inSection = (id: ChatSection): readonly Chat[] => (id === 'projects' ? [...view.projects.values()].flat() : view[id]);
  const hiddenNeeds = prefs.hidden.some(id => inSection(id).some(c => c.waiting));
  const body = (id: ChatSection) => {
    if (id === 'projects') {
      const projects = s.projects.filter(p => view.projects.has(p.id) || !q);
      if (!projects.length) return null;
      return <section key={id} aria-label="Projects">{heading(id)}{projects.map(p => {
        const list = view.projects.get(p.id) ?? [];
        const folded = prefs.folded.includes(p.id);
        const count = list.length + list.reduce((n, c) => n + (view.children.get(c.id)?.length ?? 0), 0);
        const needs = list.some(c => c.waiting);
        return <div key={p.id} className="chat-project">
          <button type="button" className="chat-project-row" aria-expanded={!folded} title={p.folder ? `${p.name} · ${p.folder}` : p.name}
            onClick={() => fold(p.id)} onContextMenu={(e: ReactMouseEvent) => menu.at(e, projectItems(p))} onKeyDown={e => keyMenu(e, projectItems(p))}>
            <span className="chat-project-chevron" data-open={!folded || undefined}><UiIcon name="chevron" size={11}/></span>
            <UiIcon name="folder" size={13}/><span className="chat-row-name" dir="auto">{p.name}</span>
            {folded && needs && <span className="chat-row-waits small" aria-label="Waiting for you"/>}
            {folded && count > 0 && <span className="chat-row-time">{count}</span>}
          </button>
          {!folded && <div className="chat-project-chats">{list.length ? withChildren(list) : <p className="chat-section-empty">No chats yet.</p>}</div>}
        </div>;
      })}</section>;
    }
    const list = view[id];
    if (!list.length) return null;
    return <section key={id} aria-label={title_(id)}>{heading(id)}{id === 'other' || id === 'pinned' || id === 'archived' ? withChildren(list) : list.map(c => row(c))}</section>;
  };

  if (s.listPhase === 'loading' && !s.conversations.length) return <p className="session-empty">Loading chats…</p>;
  if (s.listPhase === 'error' && !s.conversations.length) return <p className="session-empty">Chats could not be loaded. <button type="button" className="link-button" onClick={() => void controller.load()}>Try again</button></p>;
  const header = <div className="chat-sidebar-top">
    <label className="conversation-search"><UiIcon name="search" size={13}/><input ref={searchBox} className="conversation-filter" type="search" placeholder="Search chats" aria-label="Search chats (⌘F)" title="Search chats (⌘F)" value={query}
      maxLength={400} onChange={e => type(e.target.value)} onKeyDown={e => { if (e.key === 'Escape' && query) { e.preventDefault(); type(''); } }}/></label>
    {onNewChat && <button type="button" className="chat-new" aria-label="New chat" title="New chat (⌘N) · right-click: new project…" onClick={onNewChat}
      onContextMenu={(e: ReactMouseEvent) => menu.at(e, [{ label: 'New chat', icon: 'compose', shortcut: '⌘N', run: onNewChat }, ...(s.access !== 'denied' ? [{ label: 'New project…', icon: 'folder' as const, run: () => setProjectForm({ id: null }) }] : [])])}><UiIcon name="compose" size={14}/></button>}
    <button type="button" className="chat-new" aria-label="More for the chat list" title="New project · Edit sidebar"
      onClick={(e: ReactMouseEvent) => menu.at(e, [...(s.access !== 'denied' ? [{ label: 'New project…', icon: 'folder' as const, run: () => setProjectForm({ id: null }) }] : []), ...sectionItems])}>
      <UiIcon name="more" size={14}/>{hiddenNeeds && <span className="chat-edge-dot" title="A hidden section has something waiting for you"/>}</button>
  </div>;
  return <div className="conversations chat-sidebar">
    {header}
    {projectForm && <ProjectForm controller={controller} id={projectForm.id} onClose={() => setProjectForm(null)}/>}
    {editing ? <SidebarEditor prefs={prefs} onDone={p => { setPrefs(p); setEditing(false); }} onCancel={() => setEditing(false)}/>
      : searching ? <SearchResults state={found} projectName={projectName} onOpen={openHit}/>
      : !s.conversations.length ? <p className="session-empty">No chats yet. Start one with New chat.</p>
      : <>{shown.map(body)}{q && !shown.some(id => inSection(id).length) && <p className="session-empty">No match.</p>}</>}
    <ContextMenu menu={menu.menu} onClose={menu.close}/>
    <Notice toast={toast} onDone={id => setToast(t => (t?.id === id ? null : t))}
      onUndo={() => { const t = toast; setToast(null); const c = t && chats.find(x => x.id === t.chat); if (c) void controller.archive(c.id, !c.archived); }}/>
  </div>;
}

const title = (c: Conversation) => c.title || c.preview || 'New chat';

/** Splits the chats into the sidebar sections (a chat may also show under Running now). */
export function sections(chats: readonly Chat[], projectIds: readonly string[], q = '') {
  const match = (c: Chat) => !q || title(c).toLowerCase().includes(q) || c.preview.toLowerCase().includes(q);
  const byId = new Map(chats.map(c => [c.id, c]));
  const children = new Map<string, Chat[]>();
  const top: Chat[] = [];
  for (const c of chats) {
    if (!match(c)) continue;
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent && !parent.archived === !c.archived) children.set(parent.id, [...(children.get(parent.id) ?? []), c]);
    else top.push(c);
  }
  const live = top.filter(c => !c.archived);
  const known = new Set(projectIds);
  const projects = new Map<string, Chat[]>();
  for (const c of live) if (!c.pinned && c.projectId && known.has(c.projectId)) projects.set(c.projectId, [...(projects.get(c.projectId) ?? []), c]);
  return {
    scheduled: live.filter(c => !!c.schedule),
    running: chats.filter(c => c.running && !c.archived && match(c)),
    pinned: live.filter(c => c.pinned),
    projects,
    other: live.filter(c => !c.pinned && !(c.projectId && known.has(c.projectId))),
    archived: top.filter(c => c.archived),
    children,
  } as Record<Exclude<ChatSection, 'projects'>, Chat[]> & { projects: Map<string, Chat[]>; children: Map<string, Chat[]> };
}

/** CH9: every section with its eye (show/hide) and handle (move); Done saves, Reset restores Girru's order. */
function SidebarEditor({ prefs, onDone, onCancel }: { prefs: SidebarPrefs; onDone: (p: SidebarPrefs) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<SidebarPrefs>(prefs);
  const [drag, setDrag] = useState<ChatSection | null>(null);
  const toggle = (id: ChatSection) => setDraft(d => ({ ...d, hidden: d.hidden.includes(id) ? d.hidden.filter(x => x !== id) : [...d.hidden, id] }));
  const key = (e: ReactKeyboardEvent, id: ChatSection) => {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); setDraft(d => ({ ...d, order: moveSection(d.order, id, e.key === 'ArrowUp' ? -1 : 1) })); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const rows = [...(e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[data-section]') ?? [])]; const i = rows.indexOf(e.currentTarget as HTMLElement); rows[i + (e.key === 'ArrowUp' ? -1 : 1)]?.focus(); }
    else if (e.key === ' ') { e.preventDefault(); toggle(id); }
    else if (e.key === 'Enter') { e.preventDefault(); onDone(draft); }
  };
  return <div className="chat-sidebar-edit" role="dialog" aria-label="Edit the chat sidebar" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }}>
    <p className="chat-section-title">Edit sidebar</p>
    <div role="list">{draft.order.map(id => {
      const sec = CHAT_SECTIONS.find(x => x.id === id)!;
      const on = !draft.hidden.includes(id);
      return <div key={id} role="listitem" tabIndex={0} data-section={id} className="chat-edit-row" data-off={!on || undefined} data-drag={drag === id || undefined}
        draggable onDragStart={() => setDrag(id)} onDragEnd={() => setDrag(null)}
        onDragOver={e => { e.preventDefault(); if (drag && drag !== id) setDraft(d => { const order = d.order.filter(x => x !== drag); order.splice(order.indexOf(id) + (d.order.indexOf(drag) < d.order.indexOf(id) ? 1 : 0), 0, drag); return { ...d, order }; }); }}
        onKeyDown={e => key(e, id)}>
        <span className="chat-edit-handle" title="Drag to move (⌥↑ ⌥↓)" aria-hidden="true"><UiIcon name="grip" size={13}/></span>
        <UiIcon name={sec.icon} size={13}/>
        <span className="chat-edit-text"><b>{sec.name}</b><small>{sec.note}</small></span>
        <button type="button" className="row-tool" aria-pressed={on} aria-label={`${on ? 'Hide' : 'Show'} ${sec.name}`} title={`${on ? 'Hide' : 'Show'} ${sec.name}`} onClick={() => toggle(id)}><UiIcon name={on ? 'eye' : 'eye-off'} size={13}/></button>
      </div>;
    })}</div>
    <div className="chat-edit-actions">
      <button type="button" className="link-button" onClick={() => setDraft(DEFAULT_PREFS)}>Reset</button>
      <button type="button" className="primary" onClick={() => onDone(draft)}>Done</button>
    </div>
  </div>;
}

/** New project or edit one (name, folder, repo); the project sheet of the composer stage replaces it. */
function ProjectForm({ controller, id, onClose }: { controller: ConversationsController; id: string | null; onClose: () => void }) {
  const s = controller.getSnapshot();
  const current = id ? s.projects.find(p => p.id === id) : undefined;
  const [form, setForm] = useState({ name: current?.name ?? '', folder: current?.folder ?? '', repoUrl: current?.repoUrl ?? '' });
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return <form className="project-form" aria-label={id ? 'Edit project' : 'New project'} onSubmit={async e => {
    e.preventDefault(); setBusy(true); const err = id ? await controller.editProject(id, form) : await controller.createProject(form); setBusy(false);
    if (err) setError(err); else onClose();
  }} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
    <input autoFocus placeholder="Project name" aria-label="Project name" value={form.name} maxLength={80} onChange={e => setForm({ ...form, name: e.target.value })}/>
    <input readOnly placeholder="Choose a working folder" aria-label="Project folder" value={form.folder} dir="ltr"/>
    <button type="button" className="link-button" disabled={busy} onClick={() => setPicking(true)}>{form.folder ? 'Change folder…' : 'Choose folder…'}</button>
    {picking && <ProjectFolderPicker controller={controller} onClose={() => setPicking(false)} onSelect={folder => { setForm({ ...form, folder }); setPicking(false); }}/>}
    <input placeholder="Git repo (optional)" aria-label="Git repository" value={form.repoUrl} onChange={e => setForm({ ...form, repoUrl: e.target.value })} dir="ltr"/>
    {error && <p className="project-error" role="alert">{error}</p>}
    <div className="project-form-actions">
      <button type="submit" className="link-button" disabled={busy || !form.name.trim() || (!id && !form.folder.trim())}>{id ? 'Save' : 'Create'}</button>
      <button type="button" className="link-button" onClick={onClose}>Cancel</button>
      {id && (confirmDelete
        ? <span className="project-delete">Delete the project? Its chats stay. <button type="button" className="link-button danger" disabled={busy} onClick={async () => { setBusy(true); await controller.removeProject(id); setBusy(false); onClose(); }}>Yes, delete</button></span>
        : <button type="button" className="link-button danger" onClick={() => setConfirmDelete(true)}>Delete</button>)}
    </div>
  </form>;
}
