import { PersonalityController } from './personality';
import type {CardTab} from './agent-card';
import { AgentCard } from './AgentCard';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AgentsController } from './agents';
import { HireController } from './hire';
import { HireAgent } from './HireAgent';
import { CompanyController } from './company';
import { CompanyWizard } from './CompanyWizard';
import { namingLanguages, validatedDisplayName } from './naming';
import type { NamingLanguage } from './naming';
import type { SessionClient } from './session';
import { createPortal } from 'react-dom';
import { AgentRules } from './AgentRules';
import { UiIcon } from './ui-icons';
import { StaffDirectory } from './StaffDirectory';

export function AgentsDestination({ client, active = false, onOpenMemory, sidebarSlot,focusAgent,onChat,onPersonalities,onSpecialties,onSkills,onOpenMcp,onOpenApprovals }: { client: SessionClient; active?: boolean; onOpenMemory?: (agentId?: string) => void; sidebarSlot?: HTMLElement | null;focusAgent?:{id:string;n:number}|null;onChat?:(agentId:string)=>void;onPersonalities?:()=>void;onSpecialties?:()=>void;onSkills?:()=>void;onOpenMcp?:()=>void;onOpenApprovals?:()=>void }) {
  const [department,setDepartment]=useState('all'),[query,setQuery]=useState(''),[notice,setNotice]=useState<{id:number;text:string}|null>(null);
  const [hired,setHired]=useState<{id:number;agentId:string;name:string}|null>(null);
  const [initialSection,setInitialSection]=useState<CardTab>('profile');
  const [open, setOpen] = useState<string | null>(null);
  // The effect owns subscription cleanup; construction also supports offline SSR without reads.
  const [controller, setController] = useState<AgentsController>();
  const [personality, setPersonality] = useState<PersonalityController>();
  const [hire, setHire] = useState<HireController>();
  const [hiring, setHiring] = useState(false);
  const [company, setCompany] = useState<CompanyController>();
  const [building, setBuilding] = useState(false);
  // RULES-01: how many agent suggestions wait in Rules (the sidebar badge).
  const [ruleSuggestions, setRuleSuggestions] = useState(0);
  const session = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  const owner = session.phase === 'authenticated' && session.user?.role === 'owner';
  useEffect(() => {
    const c = new AgentsController(client), p = new PersonalityController(client), h = new HireController(client), w = new CompanyController(client);
    const unsubscribe = c.subscribe(() => {
      const selected = c.getSnapshot().selected; p.select(selected?.id ?? '', selected?.version);
    });
    setController(c); setPersonality(p); setHire(h); setCompany(w);
    return () => { unsubscribe(); c.dispose(); p.dispose(); h.dispose(); w.dispose(); };
  }, [client]);
  // Members stay on the staff list and its read-only inspector (AG1); only the owner opens the agent page.
  useEffect(()=>{if(active&&focusAgent&&owner){setInitialSection('profile');setOpen(focusAgent.id);}},[active,focusAgent?.n,owner]);
  // Opening the page shows the team at once (one read the first time the page is shown).
  useEffect(() => { if (active && session.phase === 'authenticated' && controller && controller.getSnapshot().phase === 'idle' && !controller.getSnapshot().agents.length) void controller.list(); }, [active, session.phase, controller]);
  // The Agents section owns the sidebar: the team only (search, All staff, Main agent). Departments live in
  // Settings › Departments; Personalities, Specialties and Skills in Library (each row still shows its department).
  useEffect(() => { if (!active || !owner) return; void client.request({ method: 'GET', path: '/api/agent-rules' } as never).then(r => { const n = (r.body as { suggestions?: unknown[] } | null)?.suggestions?.length; if (r.status === 200 && typeof n === 'number') setRuleSuggestions(n); }).catch(() => undefined); }, [active, owner, client]);
  const sidebar = sidebarSlot && active && controller ? createPortal(<AgentsSidebar controller={controller} open={open} query={query} onQuery={setQuery} onTeam={() => setOpen(null)}
    department={department} onDepartment={d=>{setDepartment(d);setOpen(null);}} rules={owner ? ruleSuggestions : undefined}/>, sidebarSlot) : null;
  if (open && controller && personality && owner) return <section aria-label="Agents">
    <AgentCard sidebarSlot={active?sidebarSlot:null} client={client} agentId={open} initialSection={initialSection} agents={controller} personality={personality} onBack={() => { setOpen(null); void controller.list(); }} onOpenMemory={onOpenMemory} onChat={onChat} onOpenMcp={onOpenMcp} onOpenApprovals={onOpenApprovals} library={{onPersonalities,onSpecialties,onSkills}} onOpenAgent={id=>{setInitialSection('profile');setOpen(id);}} onGone={text => { setOpen(null); setNotice({ id: Date.now(), text }); void controller.list(); }}/>
  </section>;
  const newHire=()=>{if(hire){hire.restart();setHiring(true);}};
  const newCompany=()=>{if(company){company.restart();setBuilding(true);}};
  if (department === 'rules' && owner && controller) return <section aria-label="Agents" className="agents-destination">{sidebar}
    <AgentRules client={client} active={active} onCount={setRuleSuggestions} agents={controller.getSnapshot().agents.map(a => ({ id: a.id, name: a.name ?? 'Agent', department: a.department ?? null }))}/>
  </section>;
  return <section aria-label="Agents" className="agents-destination">{sidebar}
    {owner && company && building && <CompanyWizard controller={company} onClose={() => { setBuilding(false); void controller?.list(); }}/>}
    {owner && hire && hiring && !building && <HireSheet onClose={()=>{setHiring(false);void controller?.list();}}><HireAgent controller={hire} onClose={() => { setHiring(false); void controller?.list(); }} onOpen={id => { setHiring(false); void controller?.list(); setInitialSection('profile'); setOpen(id); }} onHired={a => { setHiring(false); void controller?.list(); setHired({ id: Date.now(), agentId: a.id, name: a.name }); }}/></HireSheet>}
    {controller ? <StaffDirectory controller={controller} department={department} query={query} notice={notice} hired={hired} onDepartment={setDepartment} onOpen={owner?(id,section='profile')=>{setInitialSection(section);setOpen(id);}:()=>{}} onMemory={onOpenMemory} onHire={owner?newHire:undefined} onCompany={owner?newCompany:undefined} onChat={onChat}/>:<p role="status">Loading your team…</p>}
  </section>;

}

/** Readable status for each controller phase (the controller keeps its own words). */
const phaseLabel: Record<string, string> = {
  idle: 'Team not loaded yet', listing: 'Loading the team…', reading: 'Opening the agent…', ready: 'Ready',
  generating: 'Suggesting a name…', saving: 'Saving…', saved: 'Saved', review: 'Changed elsewhere — review before saving',
  unknown: 'Outcome unknown — reconcile before editing', reconciling: 'Checking the latest version…', error: 'Something went wrong', denied: 'Access denied',
};
export function AgentsReview({ controller }: { controller: AgentsController }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [language, setLanguage] = useState<NamingLanguage>('en');
  const busy = ['listing', 'reading', 'saving', 'reconciling', 'generating'].includes(s.phase);
  const name = validatedDisplayName(s.draft);
  return <>
    <button disabled={busy} onClick={() => void controller.list()}>{s.agents.length ? 'Reload team' : 'Load team'}</button>
    {s.agents.length > 0 && <ul className="team-grid" aria-label="Team members">{s.agents.map(a =>
      <li key={a.id}><button type="button" className="team-card" aria-pressed={s.selected?.id === a.id} disabled={busy} onClick={() => void controller.select(a.id)}>
        <span className="team-avatar" aria-hidden="true">{(a.name ?? '?').trim().slice(0, 1).toUpperCase() || '?'}</span>
        <span className="team-text"><bdi className="team-name">{a.name ?? 'Name unavailable'}</bdi><bdi className="team-id">{a.id}</bdi></span>
      </button></li>)}
    </ul>}
    <label className={s.agents.length > 0 ? 'sr-only' : undefined}>Selected agent<select value={s.selected?.id ?? ''} disabled={busy} onChange={e => void controller.select(e.target.value)}>
      <option value="">Select an agent</option>{s.agents.map(a => <option value={a.id} key={a.id}>{a.name ?? 'Name unavailable'} · {a.id}</option>)}
    </select></label>
    <p role="status">{s.notice ?? phaseLabel[s.phase] ?? s.phase}</p>
    {s.selected && <>
      <dl><dt>Stable ID</dt><dd><bdi>{s.selected.id}</bdi></dd><dt>Latest acknowledged name</dt><dd><bdi>{s.selected.name ?? 'Name unavailable'}</bdi></dd><dt>Version</dt><dd>{s.selected.version}</dd></dl>
      <label>Draft name<input value={s.draft} disabled={!s.owner || s.selected.nameUnavailable || busy || s.unknown} onChange={e => controller.edit(e.target.value)}/></label>
      <label>Suggestion language<select value={language} disabled={busy} onChange={e => setLanguage(e.target.value as NamingLanguage)}>{namingLanguages.map(l => <option key={l}>{l}</option>)}</select></label>
      <button disabled={!s.owner || s.selected.nameUnavailable || busy || s.unknown} onClick={() => void controller.generate(language)}>Generate draft</button>
      {!name && <p>Enter a name of 1–60 Unicode characters after normalization; control characters are unavailable.</p>}
      {name && name !== s.draft && <p>Normalized name to save: <bdi>{name}</bdi></p>}
      {(s.unknown || s.refreshRequired) && <button disabled={busy} onClick={() => void controller.reconcile()}>Reconcile with GET</button>}
      {s.needsReview && !s.unknown && !s.refreshRequired && <button disabled={busy} onClick={() => controller.review()}>I reviewed the latest name, version and draft</button>}
      <button className="primary" disabled={!s.owner || s.selected.nameUnavailable || busy || s.unknown || s.refreshRequired || s.needsReview || !name || name === s.selected.name} onClick={() => void controller.save()}>Save name</button>
      <button disabled={busy || s.unknown} onClick={() => controller.cancel()}>Cancel draft</button>
    </>}
  </>;
}

/** The Agents section's sidebar (board AG1): search, All staff, Main agent; Rules for the owner (RULES-01). */
function AgentsSidebar({controller,open,query,onQuery,onTeam,department,onDepartment,rules}:{controller:AgentsController;open:string|null;query:string;onQuery:(q:string)=>void;onTeam:()=>void;department:string;onDepartment:(value:string)=>void;rules?:number}){
 const s=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const here=(d:string)=>!open&&department===d?'page':undefined;
 return <nav className="dk-sidebar ag-places" aria-label="Agent places">
 <label className="dk-search ag-search"><UiIcon name="search" size={13}/><input id="ag-staff-search" type="search" aria-label="Search staff" placeholder="Search  ⌘F" value={query} onChange={e=>{onQuery(e.target.value);if(open)onTeam();}}/></label>
 <button className="nav-item dk-place" aria-current={here('all')} onClick={()=>{onDepartment('all');onTeam();}}><span className="ag-tile ag-tile-plain"><UiIcon name="users" size={13}/></span><span className="dk-place-name">All staff</span></button>
 {s.agents.some(a=>a.isPrimary)&&<button className="nav-item dk-place" aria-current={here('main')} onClick={()=>onDepartment('main')}><span className="ag-tile ag-tile-plain"><UiIcon name="sparkle" size={13}/></span><span className="dk-place-name">Main agent</span></button>}
 {rules!==undefined&&<button className="nav-item dk-place" aria-current={here('rules')} onClick={()=>onDepartment('rules')}><span className="ag-tile ag-tile-plain"><UiIcon name="scale" size={13}/></span><span className="dk-place-name">Rules</span>{rules>0&&<span className="dk-place-badge" title={`${rules} suggested ${rules===1?'rule waits':'rules wait'} for you`} aria-label={`${rules} waiting`}>{rules}</span>}</button>}
 </nav>;
}
function HireSheet({children,onClose}:{children:React.ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 return <dialog ref={ref} className="staff-hire-sheet" aria-label="Hire an agent" onCancel={e=>{e.preventDefault();}}>{children}</dialog>;
}
