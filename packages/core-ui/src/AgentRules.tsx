// RULES-01: Agents › Rules (board AgentsRules). A short list grouped by where a rule applies;
// select a rule and the inspector edits it in place (saves by itself). One main button, New rule.
// Pause, Duplicate, Earlier versions and Delete in ⋯ and the right-click menu; Delete has Undo.
// The eye shows the exact list one agent gets in one project, in order (the later one wins).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { UiIcon } from './ui-icons';
import type { UiIconName } from './ui-icons';
import { Avatar, ContextMenu, IconButton, Notice, Popover, Sheet, useMenu } from './desktop-ui';
import type { MenuItem } from './desktop-ui';
import { DocumentEditor } from './DocumentEditor';
import { RulesController, followers, reaches, ruleGroups, ruleLine, whoWords } from './agent-rules';
import type { BasicRule, FilesState, Rule, RuleAgent, RuleChange, RuleVersion, RuleWho } from './agent-rules';
import type { SessionClient } from './session';

const NEW = 'new';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent ?? '');
const mod = isMac ? '⌘' : 'Ctrl+';
const WHERE_ICON = (r: Rule): UiIconName => (r.status === 'suggested' ? 'bulb' : r.who === 'agents' ? 'avatar' : r.projectId ? 'folder' : 'globe');
const WHERE_TIP = (r: Rule) => (r.status === 'suggested' ? 'Suggested by an agent' : r.who === 'agents' ? 'Chosen agents' : r.projectId ? 'One project' : 'Everywhere');

export function AgentRules({ client, agents, active, onCount }: { client: SessionClient; agents: readonly RuleAgent[]; active: boolean; onCount?: (suggestions: number) => void }) {
  const [c] = useState(() => new RulesController(client));
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot, c.getSnapshot);
  const menu = useMenu();
  const [filter, setFilter] = useState<{ agentId: string; projectId: string }>({ agentId: '', projectId: '' });
  const [filtering, setFiltering] = useState(false);
  const [sees, setSees] = useState(false);
  const [history, setHistory] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (active) void c.load(); }, [active, c]);
  useEffect(() => { onCount?.(s.suggestions.length); }, [s.suggestions.length]);
  const agent = agents.find(a => a.id === filter.agentId) ?? null;
  const shown = (r: Rule) => reaches(r, agent, filter.projectId || null) && (!filter.projectId || r.projectId === filter.projectId || !r.projectId);
  const groups = useMemo(() => ruleGroups(s.rules.filter(shown), s.suggestions, s.projects), [s.rules, s.suggestions, s.projects, filter, agents]);
  const showBasics = !filter.projectId || true;
  const order = [...(showBasics ? s.basics.map(b => b.id) : []), ...groups.flatMap(g => g.rules.map(r => r.id))];
  // RULES-03: projects with a folder and no rules of their own still get coding app files.
  const fileOnly = s.projects.filter(p => p.folder && !groups.some(g => g.id === `project:${p.id}`));
  const [filesFor, setFilesFor] = useState<string | null>(null);
  const filesWords = (id: string) => { const f = s.files[id]; return !f ? 'Coding app files…' : f.upToDate ? 'Coding app files · up to date' : f.written ? 'Coding app files · will update' : 'Coding app files · not written'; };
  const filesLink = (id: string) => s.files[id] || s.projects.find(p => p.id === id)?.folder ? <button type="button" className="link-button rules-files-link" title="Rules written once to .girru/rules.md; CLAUDE.md and GEMINI.md point to it, AGENTS.md carries them" onClick={() => setFilesFor(id)}><UiIcon name="file" size={11}/>{filesWords(id)}</button> : null;
  const selected = s.selected === NEW ? null : c.find(s.selected);
  const filters = (filter.agentId ? 1 : 0) + (filter.projectId ? 1 : 0);

  const basicItems = (b: BasicRule): MenuItem[] => [
    ...(b.locked ? [] : [{ label: b.paused ? 'Turn on' : 'Pause', icon: (b.paused ? 'play' : 'pause') as UiIconName, shortcut: 'P', run: () => void c.pauseBasic(b.id, !b.paused) }]),
    { label: 'Write my own version…', icon: 'pencil', run: () => void c.ownVersion(b.id) },
  ];
  const itemsFor = (r: Rule): MenuItem[] => r.source === 'basic' ? basicItems(r as BasicRule) : r.status === 'suggested'
    ? [{ label: 'Use this rule', icon: 'check', run: () => void c.decide(r.id, true) }, { label: 'Dismiss', icon: 'close', run: () => void c.decide(r.id, false) }]
    : [
      { label: r.paused ? 'Turn on' : 'Pause', icon: r.paused ? 'play' : 'pause', shortcut: 'P', run: () => void c.change(r.id, { paused: !r.paused }) },
      { label: 'Duplicate', icon: 'copy', run: () => void c.duplicate(r.id) },
      { label: 'Earlier versions', icon: 'history', disabled: r.version < 2, run: () => setHistory(r.id) },
      'sep',
      { label: 'Delete', icon: 'trash', shortcut: '⌫', danger: true, run: () => void c.remove(r.id) },
    ];
  const listKey = (e: ReactKeyboardEvent) => {
    const i = order.indexOf(s.selected ?? '');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = order[Math.min(order.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))]; if (n) c.select(n); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && selected?.status === 'active' && selected.source !== 'basic') { e.preventDefault(); void c.remove(selected.id); }
    else if (e.key.toLowerCase() === 'p' && !e.metaKey && !e.ctrlKey && selected?.status === 'active' && selected.source !== 'basic') { e.preventDefault(); void c.change(selected.id, { paused: !selected.paused }); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && s.lastDeleted) { e.preventDefault(); void c.undo(); }
    else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); setSees(true); }
    else if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && selected) menu.at(e, itemsFor(selected));
  };
  const empty = s.phase === 'ready' && !s.basics.length && !s.rules.length && !s.suggestions.length;

  return <section className="dk-mem rules-page" aria-label="Rules" data-inspector={s.selected ? 'open' : undefined} onKeyDown={listKey}>
    <div className="dk-content">
      <header className="dk-toolbar">
        <div className="dk-title"><h2>Rules</h2><span className="dk-sub">How your agents work. They read these before every task.</span></div>
        <span className="dk-toolbar-gap"/>
        <IconButton icon="eye" label="What an agent sees" shortcut={`${mod}⇧E`} onClick={() => setSees(true)}/>
        <span className="dk-anchor" data-popover-anchor><IconButton icon="filter" label="Show rules for a project or an agent" pressed={filtering || filters > 0} badge={filters || undefined} onClick={() => setFiltering(v => !v)}/>
          <Popover open={filtering} onClose={() => setFiltering(false)} label="Show rules for">
            <div className="rules-filter">
              <label className="dk-field">Project<select value={filter.projectId} onChange={e => setFilter({ ...filter, projectId: e.target.value })}><option value="">Every project</option>{s.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label className="dk-field">Agent<select value={filter.agentId} onChange={e => setFilter({ ...filter, agentId: e.target.value })}><option value="">Every agent</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              {filters > 0 && <button type="button" className="link-button" onClick={() => setFilter({ agentId: '', projectId: '' })}>Show all</button>}
            </div>
          </Popover></span>
        <button type="button" className="primary" disabled={s.busy} onClick={() => c.select(NEW)}><UiIcon name="plus" size={13}/>New rule</button>
      </header>
      {s.notice && <p className="dk-inline-notice" role="alert">{s.notice}</p>}
      <div className="dk-body">
        {s.phase === 'loading' && !s.rules.length ? <p className="dk-empty" role="status">Loading the rules…</p>
          : empty ? <div className="dk-empty"><UiIcon name="scale" size={26}/><p>Rules tell every agent how you like the work done.</p>
            <span className="rules-empty-actions"><button type="button" disabled={s.busy} onClick={() => void c.starter()}>Start with our usual rules</button><button type="button" onClick={() => c.select(NEW)}><UiIcon name="plus" size={13}/>New rule</button></span>
            <small className="fine-print">"Our usual rules" adds them paused, so you look first.</small></div>
          : <div className="dk-list" role="listbox" aria-label="Rules" tabIndex={0} ref={listRef}>
            {showBasics && s.basics.length > 0 && <div className="dk-list-group" role="group" aria-label="Girru basics"><h3><UiIcon name="sparkle" size={11}/>Girru basics<span className="rules-group-side">comes with Girru</span></h3>
              {s.basics.map(b => <div key={b.id} role="option" className="dk-row rules-row rules-basic" aria-selected={s.selected === b.id} data-paused={b.paused || undefined}
                onClick={() => { c.select(b.id); listRef.current?.focus(); }} onContextMenu={(e: ReactMouseEvent) => { c.select(b.id); menu.at(e, basicItems(b)); }}>
                <span className="dk-row-icon" title={b.locked ? 'Safety rule' : 'Comes with Girru'}><UiIcon name={b.locked ? 'shield' : 'sparkle'} size={15}/></span>
                <span className="dk-row-text"><span className="dk-row-main" dir="auto">{b.text}</span>
                  <span className="dk-row-sub">{b.when && <><span className="rules-when" title="Only in this case"><UiIcon name="branch" size={11}/>When {b.when}</span> · </>}Built in · all agents</span></span>
                {b.locked ? <span className="rules-paused" title="Always on: keeps your data and computer safe"><UiIcon name="lock" size={11}/>Always on</span> : b.paused ? <span className="rules-paused"><UiIcon name="pause" size={11}/>Paused</span> : null}
              </div>)}</div>}
            {groups.map(g => <div key={g.id} className="dk-list-group" role="group" aria-label={g.title}><h3>{g.title}{g.id.startsWith('project:') && <span className="rules-group-side">{filesLink(g.id.slice(8))}</span>}</h3>
              {g.rules.map(r => <div key={r.id} role="option" className="dk-row rules-row" aria-selected={s.selected === r.id} data-paused={r.paused || undefined} data-suggested={r.status === 'suggested' || undefined}
                onClick={() => { c.select(r.id); listRef.current?.focus(); }} onContextMenu={(e: ReactMouseEvent) => { c.select(r.id); menu.at(e, itemsFor(r)); }}>
                <span className="dk-row-icon" title={WHERE_TIP(r)}><UiIcon name={WHERE_ICON(r)} size={15}/></span>
                <span className="dk-row-text"><span className="dk-row-main" dir="auto">{r.text}</span>
                  <span className="dk-row-sub">{r.when && <><span className="rules-when" title="Only in this case"><UiIcon name="branch" size={11}/>When {r.when}</span> · </>}{r.status === 'suggested' ? `${agents.find(a => a.id === r.suggestedBy)?.name ?? 'An agent'} suggests · ${whoWords(r, agents, s.projects)}${r.projectId ? '' : ' · everywhere'}` : whoWords(r, agents, s.projects)}</span></span>
                {r.paused && <span className="rules-paused"><UiIcon name="pause" size={11}/>Paused</span>}
              </div>)}</div>)}
            {fileOnly.length > 0 && <div className="dk-list-group" role="group" aria-label="Coding app files"><h3>Coding app files</h3>
              {fileOnly.map(p => <div key={p.id} className="dk-row rules-row"><span className="dk-row-icon"><UiIcon name="folder" size={15}/></span>
                <span className="dk-row-text"><span className="dk-row-main">{p.name}</span><span className="dk-row-sub">The basics and your everywhere rules, for the coding apps in this folder</span></span>{filesLink(p.id)}</div>)}</div>}
            {!groups.length && !s.basics.length && s.phase === 'ready' && <p className="dk-empty">No rule reaches {agent?.name ?? 'this choice'} here. <button type="button" className="link-button" onClick={() => setFilter({ agentId: '', projectId: '' })}>Show all</button></p>}
          </div>}
      </div>
    </div>
    {s.selected && <aside className="dk-inspector" aria-label="Rule details">
      {selected?.source === 'basic' ? <BasicInspector key={s.selected} c={c} basic={selected as BasicRule} onMenu={e => menu.at(e, basicItems(selected as BasicRule))}/> : <RuleInspector key={s.selected} c={c} rule={selected ?? null} agents={agents} onHistory={() => selected && setHistory(selected.id)} onMenu={e => selected && menu.at(e, itemsFor(selected))}/>}
    </aside>}
    <ContextMenu menu={menu.menu} onClose={menu.close}/>
    {sees && <AgentSees c={c} agents={agents} projects={s.projects} initial={filter} onClose={() => setSees(false)}/>}
    {history && <VersionsSheet c={c} id={history} onClose={() => setHistory(null)}/>}
    {filesFor && <FilesSheet c={c} projectId={filesFor} name={s.projects.find(p => p.id === filesFor)?.name ?? 'Project'} onClose={() => setFilesFor(null)}/>}
    <Notice toast={s.toast} onUndo={() => void c.undo()} onDone={id => c.dismiss(id)}/>
  </section>;
}

/** The selected rule (or a new one): its words, where, who, on/off, from, versions. Saves by itself. */
function RuleInspector({ c, rule, agents, onHistory, onMenu }: { c: RulesController; rule: Rule | null; agents: readonly RuleAgent[]; onHistory: () => void; onMenu: (e: ReactMouseEvent) => void }) {
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot, c.getSnapshot);
  const [text, setText] = useState(rule?.text ?? '');
  // RULES-02: a rule may apply only in a case ("When …"); null = always.
  const [when, setWhen] = useState<string | null>(rule?.when ?? null);
  const whenRef = useRef<HTMLInputElement>(null);
  const [reach, setReach] = useState<{ projectId: string | null; who: RuleWho; targets: string[] }>({ projectId: rule?.projectId ?? null, who: rule?.who ?? 'all', targets: [...(rule?.targets ?? [])] });
  const [editor, setEditor] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (!rule) area.current?.focus(); }, []);
  const save = (change: RuleChange) => {
    if (!rule) { const t = (change.text ?? text).trim(); const w = change.when !== undefined ? change.when : when?.trim() || null; if (t) void c.create({ text: t, when: w, projectId: change.projectId ?? reach.projectId, who: change.who ?? reach.who, targets: change.targets ?? reach.targets }); return; }
    void c.change(rule.id, change);
  };
  // Saves by itself: a moment after typing stops, and when the field is left.
  useEffect(() => { if (!rule || text.trim() === rule.text || !text.trim()) return; const t = setTimeout(() => save({ text: text.trim() }), 800); return () => clearTimeout(t); }, [text]);
  useEffect(() => { if (!rule || when === null || !when.trim() || when.trim() === rule.when) return; const t = setTimeout(() => save({ when: when.trim() }), 800); return () => clearTimeout(t); }, [when]);
  const setCase = (only: boolean) => { if (!only) { setWhen(null); if (rule?.when) save({ when: null }); } else { setWhen(w => w ?? ''); requestAnimationFrame(() => whenRef.current?.focus()); } };
  const setWho = (who: RuleWho) => { const next = { ...reach, who, targets: who === reach.who ? reach.targets : [] }; setReach(next); if (who === 'all' || next.targets.length) save({ who, targets: next.targets }); };
  const toggle = (t: string) => { const targets = reach.targets.includes(t) ? reach.targets.filter(x => x !== t) : [...reach.targets, t]; setReach({ ...reach, targets }); if (targets.length) save({ who: reach.who, targets }); };
  const setWhere = (projectId: string | null) => { setReach({ ...reach, projectId }); save({ projectId }); };
  const suggested = rule?.status === 'suggested';
  const by = rule?.suggestedBy ? agents.find(a => a.id === rule.suggestedBy)?.name ?? 'An agent' : null;
  const n = followers(reach, agents);
  return <div className="rules-inspector">
    <div className="rules-inspector-head"><b>{rule ? (suggested ? 'Suggested rule' : 'Rule') : 'New rule'}</b>
      {rule && !suggested && <label className="rules-switch" title={rule.paused ? 'Paused: agents do not get it (P)' : 'On: agents follow it (P)'}><span>{rule.paused ? 'Paused' : 'On'}</span>
        <input type="checkbox" role="switch" aria-label="Agents follow this rule" checked={!rule.paused} onChange={e => save({ paused: !e.target.checked })}/></label>}
      {rule && !suggested && <IconButton icon="more" label="More" onClick={onMenu}/>}
      <IconButton icon="close" label="Close" shortcut="Esc" onClick={() => c.select(null)}/></div>
    {suggested && <p className="rules-from"><Avatar name={by ?? 'Agent'} size={20}/>{by} suggests this{rule?.reason ? <> · <span className="fine-print">Why: “{rule.reason}”</span></> : null}</p>}
    <div className="dk-field">When it applies
      <span className="dk-segmented" role="group" aria-label="When it applies">
        <button type="button" aria-pressed={when === null} onClick={() => setCase(false)}>Always</button>
        <button type="button" aria-pressed={when !== null} onClick={() => setCase(true)}><UiIcon name="branch" size={12}/>Only when…</button></span>
      {when !== null && <label className="rules-when-field"><b>When</b><input ref={whenRef} dir="auto" aria-label="The case" maxLength={300} value={when} placeholder="the task changes a screen"
        onChange={e => setWhen(e.target.value)} onBlur={() => { const w = when.trim(); if (rule && w && w !== rule.when) save({ when: w }); }}
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); c.select(null); } }}/></label>}
      {when !== null && <small className="fine-print">Say the case the way you would tell a person. Agents follow the rule only then.</small>}</div>
    <label className="dk-field">The rule
      <textarea ref={area} rows={4} dir="auto" value={text} placeholder="One sentence, the way you would tell a person. For example: Run the tests before you say a task is done."
        onChange={e => setText(e.target.value)} onBlur={() => { if (text.trim() && text.trim() !== rule?.text) save({ text: text.trim() }); }}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); setEditor(true); } else if (e.key === 'Escape') { e.stopPropagation(); c.select(null); } }}/>
      <small className="fine-print">{rule ? 'Saves by itself.' : 'Saved when you leave the field.'} Long rules open in the editor ({mod}↩).</small></label>
    <div className="dk-field">Where it applies
      <span className="dk-segmented" role="group" aria-label="Where it applies">
        <button type="button" aria-pressed={!reach.projectId} onClick={() => setWhere(null)}><UiIcon name="globe" size={12}/>Everywhere</button>
        <button type="button" aria-pressed={!!reach.projectId} disabled={!s.projects.length} title={s.projects.length ? undefined : 'No project yet'} onClick={() => setWhere(reach.projectId ?? s.projects[0]?.id ?? null)}><UiIcon name="folder" size={12}/>One project</button></span>
      {reach.projectId && <select aria-label="Project" value={reach.projectId} onChange={e => setWhere(e.target.value)}>{s.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>
    <div className="dk-field">Who follows it
      <span className="dk-segmented" role="group" aria-label="Who follows it">
        {([['all', 'All agents'], ['departments', 'A department'], ['agents', 'Chosen agents']] as const).map(([v, label]) => <button key={v} type="button" aria-pressed={reach.who === v} onClick={() => setWho(v)}>{label}</button>)}</span>
      {reach.who !== 'all' && <span className="rules-targets" role="group" aria-label={reach.who === 'departments' ? 'Departments' : 'Agents'}>
        {(reach.who === 'departments' ? s.departments.map(d => ({ id: d, name: d[0].toUpperCase() + d.slice(1) })) : agents).map(t =>
          <button key={t.id} type="button" className="rules-chip" aria-pressed={reach.targets.includes(t.id)} onClick={() => toggle(t.id)}>{reach.who === 'agents' && <Avatar name={t.name} size={16}/>}{t.name}</button>)}
        {reach.who === 'departments' && !s.departments.length && <small className="fine-print">No departments yet. Set them on each agent’s page.</small>}</span>}
      <small className="fine-print">{reach.who !== 'all' && !reach.targets.length ? 'Choose at least one.' : `${n} ${n === 1 ? 'agent follows' : 'agents follow'} it${reach.projectId ? ' in this project' : ''}.`}</small></div>
    {text.trim() && <p className="rules-reads"><b>The agent reads:</b> <span dir="auto">{ruleLine({ text: text.trim(), when: when?.trim() || null })}</span></p>}
    {rule && !suggested && <p className="rules-from">{rule.source === 'agent' ? <>Suggested by {by}, used by you</> : <>Written by you</>} · {new Date(rule.createdAt.replace(' ', 'T') + (rule.createdAt.includes('Z') ? '' : 'Z')).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>}
    {rule && !suggested && rule.version > 1 && <button type="button" className="link-button rules-versions" onClick={onHistory}><UiIcon name="history" size={13}/>{rule.version - 1} earlier {rule.version === 2 ? 'version' : 'versions'}</button>}
    {suggested && <span className="rules-decide"><button type="button" disabled={s.busy} onClick={() => void c.decide(rule!.id, false)}>Dismiss</button><button type="button" className="primary" disabled={s.busy} onClick={() => void c.decide(rule!.id, true)}>Use this rule</button></span>}
    <small className="fine-print rules-order">A rule without “When” always applies. A project rule comes after an everywhere rule, and a rule for chosen agents comes last. When two disagree, the later one wins.</small>
    {editor && <DocumentEditor title="Rule" files={[{ id: 'rule', name: 'Rule.md', content: text }]} maxLength={2000} onChange={(_, t) => setText(t)} onClose={() => { setEditor(false); if (text.trim() && text.trim() !== rule?.text) save({ text: text.trim() }); }}/>}
  </div>;
}

/** The exact list one agent gets in one project, in order. */
function AgentSees({ c, agents, projects, initial, onClose }: { c: RulesController; agents: readonly RuleAgent[]; projects: readonly { id: string; name: string }[]; initial: { agentId: string; projectId: string }; onClose: () => void }) {
  const [agentId, setAgentId] = useState(initial.agentId || agents[0]?.id || '');
  const [projectId, setProjectId] = useState(initial.projectId);
  const [list, setList] = useState<Rule[] | null>(null);
  const [check, setCheck] = useState<{ conflicts: { a: string; b: string; why: string }[]; checked: boolean } | null | 'checking'>(null);
  useEffect(() => {
    if (!agentId) return;
    let on = true;
    setList(null); setCheck(null);
    void c.effective(agentId, projectId || null).then(l => {
      if (!on) return;
      setList(l);
      // Two or more rules: the local model looks for ones that disagree (a moment; the list shows first).
      if (l && l.length > 1) { setCheck('checking'); void c.conflicts(agentId, projectId || null).then(r => { if (on) setCheck(r ?? { conflicts: [], checked: false }); }); }
    });
    return () => { on = false; };
  }, [agentId, projectId]);
  const textOf = (id: string) => { const r = list?.find(x => x.id === id); return r ? ruleLine(r) : ''; };
  const open = (id: string) => { c.select(id); onClose(); };
  const tier = (r: Rule) => (r.who === 'agents' ? 'this agent' : r.projectId ? projects.find(p => p.id === r.projectId)?.name ?? 'project' : 'everywhere');
  return <Sheet title="What an agent sees" onClose={onClose} wide actions={<button type="button" className="primary" onClick={onClose}>Done</button>}>
    <div className="rules-sees-pick">
      <label className="dk-field">Agent<select value={agentId} onChange={e => setAgentId(e.target.value)}>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="dk-field">In<select value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">A chat without a project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    </div>
    {list === null ? <p className="fine-print" role="status">Reading…</p> : list.length ? <ol className="rules-sees">{list.map(r => <li key={r.id} dir="auto">{r.when && <span className="rules-when-lead">When {r.when}: </span>}{r.text} <span className="fine-print">· {tier(r)}</span></li>)}</ol>
      : <p className="fine-print">No rule reaches this agent here.</p>}
    {check === 'checking' && <p className="fine-print" role="status">Checking for rules that disagree…</p>}
    {check && check !== 'checking' && check.conflicts.map(x => <div key={`${x.a}-${x.b}`} className="rules-conflict" role="alert"><UiIcon name="alert" size={14}/>
      <span>Two rules disagree: “{textOf(x.a)}” and “{textOf(x.b)}”.{x.why ? ` ${x.why}` : ''} The later one, “{textOf(x.b)}”, wins.
        <span className="rules-conflict-open"><button type="button" className="link-button" onClick={() => open(x.a)}>Open the first</button><button type="button" className="link-button" onClick={() => open(x.b)}>Open the second</button></span></span></div>)}
    {check && check !== 'checking' && !check.checked && <p className="fine-print">The local model could not check whether rules disagree right now.</p>}
    <p className="fine-print">This is the list, in this order, that the agent gets before a task. When two disagree, the later one wins; two rules for different cases do not disagree. Paused rules are left out.</p>
  </Sheet>;
}

function VersionsSheet({ c, id, onClose }: { c: RulesController; id: string; onClose: () => void }) {
  const [list, setList] = useState<RuleVersion[] | null>(null);
  useEffect(() => { void c.versions(id).then(setList); }, [id]);
  return <Sheet title="Earlier versions" onClose={onClose} actions={<button type="button" onClick={onClose}>Close</button>}>
    {list === null ? <p className="fine-print" role="status">Reading…</p> : !list.length ? <p className="fine-print">No earlier version.</p>
      : <ul className="rules-history">{list.map(v => <li key={v.version}><span dir="auto">{v.text}</span><small className="fine-print">{new Date(v.changedAt.replace(' ', 'T') + 'Z').toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
        <button type="button" className="link-button" onClick={() => { void c.restore(id, v.version); onClose(); }}>Put back</button></li>)}</ul>}
  </Sheet>;
}

/** RULES-03: a built-in rule: read-only words, a switch (or a lock for safety), and my own version. */
function BasicInspector({ c, basic, onMenu }: { c: RulesController; basic: BasicRule; onMenu: (e: ReactMouseEvent) => void }) {
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot, c.getSnapshot);
  return <div className="rules-inspector">
    <div className="rules-inspector-head"><b>Built-in rule</b>
      {basic.locked ? <span className="rules-paused" title="Safety rule: always on, for everyone"><UiIcon name="lock" size={12}/>Always on</span>
        : <label className="rules-switch" title={basic.paused ? 'Paused: agents do not get it (P)' : 'On: agents follow it (P)'}><span>{basic.paused ? 'Paused' : 'On'}</span>
          <input type="checkbox" role="switch" aria-label="Agents follow this rule" checked={!basic.paused} disabled={s.busy} onChange={e => void c.pauseBasic(basic.id, !e.target.checked)}/></label>}
      <IconButton icon="more" label="More" onClick={onMenu}/>
      <IconButton icon="close" label="Close" shortcut="Esc" onClick={() => c.select(null)}/></div>
    <p className="rules-reads" dir="auto">{basic.when && <span className="rules-when-lead">When {basic.when}: </span>}{basic.text}</p>
    <p className="rules-from"><UiIcon name="sparkle" size={13}/>Comes with Girru. Updates with Girru.</p>
    <div className="dk-field">Want it different?
      <button type="button" className="rules-own" disabled={s.busy} onClick={() => void c.ownVersion(basic.id)}>Write my own version…</button>
      <small className="fine-print">Your version comes after the built-in rules, so it wins.{basic.locked ? '' : ' Pause this one if you want only yours.'}</small></div>
    <div className="dk-field">Who follows it<span className="rules-from">All agents, everywhere</span></div>
    <small className="fine-print rules-order">Built-in rules come first; your rules come after them and win. Safety rules are always on.</small>
  </div>;
}

const ACTION_WORDS: Record<FilesState['files'][number]['action'], string> = {
  create: 'will be created', add: 'gets the Girru part (your notes stay)', update: 'will be updated', unchanged: 'up to date',
  tracked: 'already in Git: left as it is while the files are private', link: 'is a link: never written through',
};
/** RULES-03: one project's coding app files: what writing does, private or with the project, then Write the files. */
function FilesSheet({ c, projectId, name, onClose }: { c: RulesController; projectId: string; name: string; onClose: () => void }) {
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot, c.getSnapshot);
  const [state, setState] = useState<FilesState | null>(s.files[projectId] ?? null);
  const [mode, setMode] = useState<'private' | 'project'>(s.files[projectId]?.mode ?? 'private');
  useEffect(() => { void c.filesState(projectId).then(f => { if (f) { setState(f); setMode(f.mode); } }); }, [projectId]);
  const write = async () => { if (await c.writeFiles(projectId, mode)) onClose(); };
  return <Sheet title={`Coding app files · ${name}`} wide onClose={onClose} actions={<><button type="button" onClick={onClose}>Not now</button>
    <button type="button" className="primary" disabled={s.busy || !state?.hasFolder} onClick={() => void write()}>{state?.written ? 'Write the files again' : 'Write the files'}</button></>}>
    <p className="fine-print rules-files-intro">The rules are written once, to .girru/rules.md. CLAUDE.md and GEMINI.md get one line that points to it. Codex and Antigravity read AGENTS.md and do not follow that line, so AGENTS.md gets the rules themselves. A rule change re-writes them by itself. Inside Girru the apps already get the rules; these files are for when an app runs on its own in this folder.</p>
    {!state ? <p className="fine-print" role="status">Reading the folder…</p> : !state.hasFolder ? <p className="dk-inline-notice">This project has no folder yet.</p>
      : <ul className="rules-files">{state.files.map(f => <li key={f.name} data-action={f.action}><UiIcon name="file" size={13}/><code>{f.name}</code><span className="fine-print">{ACTION_WORDS[f.action]}</span></li>)}</ul>}
    {state?.rules && <pre className="rules-files-preview" dir="auto">{state.rules.split('\n').slice(1).join('\n').trim()}</pre>}
    <div className="dk-field">Keep these files
      <span className="dk-segmented" role="group" aria-label="Keep these files">
        <button type="button" aria-pressed={mode === 'private'} onClick={() => setMode('private')}>Private on this computer</button>
        <button type="button" aria-pressed={mode === 'project'} onClick={() => setMode('project')}>With the project (in Git)</button></span>
      <small className="fine-print">{mode === 'private' ? 'Girru adds them to this folder’s own Git exclude, so nothing is committed or pushed.' : 'Everyone who opens the repository gets the same rules. Girru never commits; that stays your call.'}</small></div>
  </Sheet>;
}
