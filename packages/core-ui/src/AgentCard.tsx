import {AgentSpecialtySettings} from './AgentSpecialtySettings';
import {Explorer} from './MemoryExplorer';
import {MemoryExplorerController} from './memory-explorer';
import {AgentPersonalityLibrary} from './AgentPersonalityLibrary';
import {createPortal} from 'react-dom';
import {Avatar} from './desktop-ui';
import {AgentConfigurationSummary} from './AgentConfigurationSummary';
import { AgentMcp } from './McpLibrary';
import { AgentSkills } from './SkillLibrary';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AgentCardController, readable, TOOL_GROUPS, toolGroup } from './agent-card';
import type { CardTab } from './agent-card';
import type { AgentsController } from './agents';
import type { PersonalityController } from './personality';
import { PersonalityReview } from './PersonalityReview';
import { permissionCategories, drawerKinds } from './hire-contract.js';
import { drawerLabel } from './MemoryViews';
import { AgentMemoryController, handoffLine } from './agent-memory';
import { ago } from './memory-store';
import { validatedDisplayName } from './naming';
import { UiIcon } from './ui-icons';

export const AGENT_SECTIONS: {key:CardTab;label:string;icon:Parameters<typeof UiIcon>[0]['name']}[]=[
 {key:'profile',label:'General',icon:'contact'},{key:'persona',label:'Personality',icon:'sparkle'},
 {key:'skills',label:'Specialties and skills',icon:'layers'},{key:'memory',label:'Memory',icon:'brain'},
 {key:'permissions',label:'Permissions',icon:'shield'},{key:'activity',label:'Activity',icon:'clock'}
];
const TABS=AGENT_SECTIONS;
const ROLE_LABEL: Record<string, string> = { '': 'No role', main: 'Main agent', manager: 'Manager', specialist: 'Specialist', evaluator: 'Evaluator' };
export const CATEGORY: Record<string, string> = { browser: 'Use the browser', network: 'Reach the internet', message: 'Send messages', delete: 'Delete things', install: 'Install software', money: 'Spend money', settings: 'Change settings' };
const DIALECT: Record<string, string> = { 'ar-IQ': 'Arabic (Iraqi)', ar: 'Arabic', en: 'English', de: 'German', fr: 'French', es: 'Spanish', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', 'pt-BR': 'Portuguese (Brazil)', ru: 'Russian', tr: 'Turkish', hi: 'Hindi' };

/**
 * One agent's card: who it is (profile), how it behaves (persona, versioned),
 * what it may do (tools, memory drawers, off/ask/allow) and what it can
 * remember (the memories in drawers it may read).
 */
export function AgentCard({ client, agentId, agents, personality, onBack, onOpenMemory, sidebarSlot, initialSection = 'profile' }: {
  client: ConstructorParameters<typeof AgentCardController>[0]; agentId: string; agents: AgentsController; personality: PersonalityController;
  initialSection?:CardTab; onBack: () => void; onOpenMemory?: (agentId?: string) => void; sidebarSlot?:HTMLElement|null;
}) {
  const [card, setCard] = useState<AgentCardController>();
  useEffect(() => { const c = new AgentCardController(client, agentId, initialSection); setCard(c); void c.load(); void agents.select(agentId); return () => c.dispose(); }, [client, agentId, agents]);
  if (!card) return null;
  return <CardView card={card} agents={agents} personality={personality} onBack={onBack} onOpenMemory={onOpenMemory} sidebarSlot={sidebarSlot}/>;
}

export function CardView({ card, agents, personality, onBack, onOpenMemory, sidebarSlot }: { card: AgentCardController; agents?: AgentsController; personality?: PersonalityController; onBack: () => void; onOpenMemory?: (agentId?: string) => void;sidebarSlot?:HTMLElement|null }) {
  const s = useSyncExternalStore(card.subscribe, card.getSnapshot, card.getSnapshot);
  const [personalityDirty,setPersonalityDirty]=useState(false),[navigationNotice,setNavigationNotice]=useState('');
  const navigate=(next?:CardTab)=>{if(personalityDirty){setNavigationNotice('Save or discard personality changes before leaving this section.');return;}if(!next&&(card.profileChanged()||card.permissionsChanged())){setNavigationNotice('Save or discard your general settings or permissions before leaving this agent.');return;}setNavigationNotice('');if(next)void card.openTab(next);else onBack();};
  const a = s.agent;
  const busy = s.phase === 'saving' || s.phase === 'loading';
  const navigation=<nav className="agent-profile-sidebar dk-sidebar" aria-label="Agent profile sections"><button className="agent-return" onClick={()=>navigate()}><UiIcon name="arrow-left" size={15}/>All staff</button><div className="agent-sidebar-identity"><Avatar name={a?.name??'Agent'} size={40}/><strong><bdi>{a?.name??'Agent'}</bdi></strong><small>{a?.department||'No department'}</small></div><p className="section-label">Agent</p>{TABS.map(t=><button className="nav-item dk-place" title={t.label} type="button" key={t.key} aria-current={s.tab===t.key||t.key==='permissions'&&s.tab==='mcp'?'page':undefined} onClick={()=>navigate(t.key)}><UiIcon name={t.icon} size={16}/><span>{t.label}</span></button>)}</nav>;
  return <article className="agent-card" aria-label={a?.name ? `Agent ${a.name}` : 'Agent'}>
    {sidebarSlot?createPortal(navigation,sidebarSlot):navigation}
    <header className="agent-card-head"><button type="button" className="back-link" title="Back to staff" aria-label="Back to staff" onClick={()=>navigate()}><UiIcon name="arrow-left" size={16}/></button><div><h3>{TABS.find(t=>t.key===s.tab)?.label??'Tools and connections'}</h3><p className="agent-card-sub"><bdi>{a?.name??'Loading agent…'}</bdi> · {ROLE_LABEL[a?.role??'']}{a?.department?` · ${a.department}`:''}</p></div></header>
    <div className="agent-detail-layout" data-single-sidebar={!!sidebarSlot}><div className="agent-detail-content page-ui">
    {navigationNotice&&<p role="status">{navigationNotice}</p>}
    {s.notice && <p className="card-notice" role="alert">{s.notice}</p>}
    {s.saved && <p className="card-saved" role="status"><UiIcon name="check" size={12}/>{s.saved}</p>}
    {s.phase === 'error' ? null : <>
      {s.tab === 'profile' && <><AgentConfigurationSummary compact key={s.agentId} client={card.client} agentId={s.agentId} onPersonality={()=>void card.openTab('persona')} onSkills={()=>void card.openTab('skills')}/><ProfileTab card={card} agents={agents} busy={busy}/></>}
      {s.tab === 'persona' && <PersonaTab card={card} personality={personality} busy={busy} onDirtyChange={setPersonalityDirty}/>}
      {s.tab === 'permissions' && <><PermissionsTab card={card} busy={busy} part="access"/><details className="agent-advanced-tools"><summary>Tools and connections</summary><PermissionsTab card={card} busy={busy} part="tools"/><AgentMcp key={s.agentId} client={card.client} agentId={s.agentId}/></details></>}
      {s.tab === 'mcp' && <><PermissionsTab card={card} busy={busy} part="tools"/><AgentMcp key={s.agentId} client={card.client} agentId={s.agentId}/></>}
      {s.tab === 'skills' && <div className="card-section"><AgentSpecialtySettings key={s.agentId} client={card.client} agentId={s.agentId}/><h4>Additional skills</h4><AgentSkills key={s.agentId} client={card.client} agentId={s.agentId}/></div>}
      {s.tab === 'activity' && <ActivityTab card={card}/>}
      {s.tab === 'memory' && <MemoryTab card={card} onOpenMemory={onOpenMemory}/>}
    </>}
  </div></div></article>;
}

function ProfileTab({ card, agents, busy }: { card: AgentCardController; agents?: AgentsController; busy: boolean }) {
  const s = card.getSnapshot();
  useSyncExternalStore(card.subscribe, card.getSnapshot, card.getSnapshot);
  const n = useSyncExternalStore(agents ? agents.subscribe : noop, agents ? agents.getSnapshot : none, agents ? agents.getSnapshot : none);
  const nameOk = n ? validatedDisplayName(n.draft) : null;
  const nameBusy = !!n && ['listing', 'reading', 'saving', 'reconciling', 'generating'].includes(n.phase);
  return <div className="card-section">
    {agents && n?.selected && <div className="field-row">
      <label className="field"><span>Name</span>
        <input value={n.draft} disabled={nameBusy || n.unknown} onChange={e => agents.edit(e.target.value)}/></label>
      <button type="button" disabled={nameBusy || !nameOk || nameOk === n.selected.name || n.needsReview || n.refreshRequired} onClick={() => void agents.save()}>Save name</button>
      <button type="button" className="ghost" disabled={nameBusy} onClick={() => void agents.generate('en')}>Suggest</button>
    </div>}
    <div className="field-grid">
      <label className="field"><span>Role</span>
        <select value={s.profile.role} disabled={busy} onChange={e => card.editProfile({ role: e.target.value })}>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
      <label className="field"><span>Department</span>
        <input value={s.profile.department} placeholder="e.g. marketing" maxLength={64} disabled={busy} onChange={e => card.editProfile({ department: e.target.value })}/></label>
    </div>
    <ModelField card={card} busy={busy}/>
    <label className="field"><span>Responsibilities</span><textarea rows={5} dir="auto" value={s.profile.description} maxLength={1000} disabled={busy} onChange={e=>card.editProfile({description:e.target.value})}/></label>

    <p className="fine-print">A role change never changes the persona or the permissions; those are set in their own sections.</p>
    <div className="card-actions">
      <button type="button" className="primary" disabled={busy || !card.profileChanged()} onClick={() => void card.saveProfile()}>Save general settings</button><button disabled={busy||!card.profileChanged()} onClick={()=>card.discardProfile()}>Discard general changes</button>
      <details><summary>About this agent</summary><small>Agent ID <bdi>{s.agentId}</bdi></small></details>
    </div>
  </div>;
}

function PersonaTab({ card, personality, busy,onDirtyChange }: { card: AgentCardController; personality?: PersonalityController; busy: boolean;onDirtyChange?:(dirty:boolean)=>void }) {
  const s = useSyncExternalStore(card.subscribe, card.getSnapshot, card.getSnapshot);
  const p = s.persona;
  if (!p) return <p className="fine-print">The persona could not be loaded.</p>;
  const locked = p.locked;
  return <div className="card-section">
    <AgentPersonalityLibrary client={card.client} agentId={s.agentId} onDirtyChange={onDirtyChange} version={p.version} locked={locked||busy} onChanged={()=>void card.load()}/>
    <div className="card-actions"><button type="button" disabled={busy} onClick={() => void card.lock(!locked)}>{locked ? 'Unlock persona' : 'Lock persona'}</button></div>
    {s.versions && s.versions.length > 0 && <details className="card-sub" aria-label="Persona history"><summary>Version history and restore</summary>
      <ol className="version-list">{s.versions.map(v => <li key={v.version} data-current={v.version === p.version || undefined}>
        <span className="version-n">v{v.version}</span>
        <span className="version-what">{v.preset ? p.presets.find(x => x.id === v.preset)?.label ?? v.preset : 'Custom'} · {DIALECT[v.dialect] ?? v.dialect}{v.locked ? ' · locked' : ''}{v.note ? <> · <bdi>{v.note}</bdi></> : ''}</span>
        <span className="version-when">{v.source === 'seed' ? 'first version' : (v.createdAt ?? '').slice(0, 16).replace('T', ' ')}</span>
        {v.version === p.version ? <span className="chip">Current</span>
          : <button type="button" className="ghost-action" disabled={busy || locked} onClick={() => void card.rollback(v.version)}>Restore</button>}
      </li>)}</ol>
    </details>}
    {personality && <details className="card-sub" aria-label="Suggested persona changes"><summary>Suggested changes</summary><PersonalityReview controller={personality}/></details>}
  </div>;
}

/** Access (drawers + actions) or Tools (by kind); one save for both. */
function PermissionsTab({ card, busy, part }: { card: AgentCardController; busy: boolean; part: 'access' | 'tools' }) {
  const s = useSyncExternalStore(card.subscribe, card.getSnapshot, card.getSnapshot);
  const [confirm, setConfirm] = useState(false);
  const d = s.permissionDraft, g = s.grants, gd = s.grantDraft ?? [];
  if (!d || !g) return <p className="fine-print">Loading permissions…</p>;
  const save = () => { if (card.riskyAllowed() && !confirm) { setConfirm(true); return; } setConfirm(false); void card.savePermissions(card.riskyAllowed()); };
  return <div className="card-section">
    {part === 'access' && <>
    <section className="card-sub" aria-label="Actions">
      <h4>Actions</h4>
      <div className="mode-list">{permissionCategories.map(c=><label key={c} className="mode-row"><span>{CATEGORY[c]??c}</span><select aria-label={CATEGORY[c]??c} value={d.modes[c]} disabled={busy} onChange={e=>card.setMode(c,e.target.value)}><option value="off">Blocked</option><option value="ask">Ask me each time</option><option value="allow">Allowed under policy</option></select></label>)}</div>
    </section></>}
    {part === 'tools' && <section className="card-sub" aria-label="Tools">
      <h4>Tools <small className="fine-print">{gd.length} of {g.available.length} on</small></h4>
      {TOOL_GROUPS.map(group => {
        const tools = g.available.filter(t => toolGroup(t.name) === group);
        if (!tools.length) return null;
        const on = tools.filter(t => gd.includes(t.name)).length;
        return <div key={group} className="tool-group">
          <div className="tool-group-head">
            <span className="tool-group-name">{group}</span>
            <span className="fine-print">{on} of {tools.length} on</span>
            <button type="button" className="ghost-action" disabled={busy} onClick={() => card.setTools(tools.map(t => t.name), on < tools.length)}>{on < tools.length ? 'Turn all on' : 'Turn all off'}</button>
          </div>
          <ul className="tool-grid">{tools.map(t => {
            const off = !t.allowedByServer;
            return <li key={t.name}><label className="tool-check" data-off={off || undefined}>
              <input type="checkbox" checked={gd.includes(t.name)} disabled={busy || (off && !gd.includes(t.name))} onChange={() => card.toggleTool(t.name)}/>
              <span><code>{t.name}</code>{t.requiresApproval && <span className="chip">asks first</span>}{off && <span className="chip">off on this server</span>}<small>{t.description}</small></span>
            </label></li>;
          })}</ul>
        </div>;
      })}
    </section>}
    {confirm && <p className="card-notice" role="alert">You allowed a risky action (spend money, install software or delete). Press Save again to confirm.</p>}
    <div className="card-actions sticky">
      <button type="button" className="primary" disabled={busy || !card.permissionsChanged()} onClick={save}>{confirm ? 'Confirm and save' : 'Save permissions'}</button><button disabled={busy||!card.permissionsChanged()} onClick={()=>{card.discardPermissions();setConfirm(false);}}>Discard permission changes</button>
    </div>
  </div>;
}

/**
 * The agent's memory (board M6): what it may remember (drawers read / write,
 * shared with the team; its role template and exceptions from Memory › Access),
 * the notes it wrote itself, its handoffs, and its skills and tools at a glance.
 */
function MemoryTab({card}:{card:AgentCardController;onOpenMemory?:(agentId?:string)=>void}){
 const [explorer,setExplorer]=useState<MemoryExplorerController>();
 useEffect(()=>{const c=new MemoryExplorerController(card.client as never,`agent:${card.getSnapshot().agentId}`);setExplorer(c);void c.load();return()=>c.dispose();},[card]);
 return <div className="agent-memory-direct"><p className="fine-print">Saved memories from this agent. Select a memory to read, edit or review its history.</p>{explorer?<Explorer c={explorer} agents={{[card.getSnapshot().agentId]:card.getSnapshot().agent?.name??'This agent'}}/>:<p role="status">Reading memories…</p>}<details className="agent-memory-rules"><summary>Memory rules</summary><MemoryRules card={card}/></details></div>;
}
function ActivityTab({card}:{card:AgentCardController}){
 const s=useSyncExternalStore(card.subscribe,card.getSnapshot,card.getSnapshot),[mem,setMem]=useState<AgentMemoryController>();
 useEffect(()=>{const c=new AgentMemoryController(card.client as never,s.agentId);setMem(c);void c.load();return()=>c.dispose();},[card,s.agentId]);
 const m=useSyncExternalStore(mem?.subscribe??noopSubscribe,mem?.getSnapshot??noSnapshot,mem?.getSnapshot??noSnapshot);
 return <div className="card-section agent-activity"><section><h4>Recent work notes</h4>{!m||m.phase==='loading'?<p role="status">Reading activity…</p>:m.handoffs===null?<p role="status">Activity could not be read. <button onClick={()=>void mem?.load()}>Retry activity</button></p>:m.handoffs.length?<ul>{m.handoffs.map(h=><li key={h.id}><small>{h.kind==='conversation'?'Chat':'Board task'} · {ago(h.createdAt)}</small><p>{handoffLine(h)||'No summary recorded.'}</p></li>)}</ul>:<p>No work notes recorded for this agent yet.</p>}</section><section><h4>Personality changes</h4>{s.versions?<ol>{s.versions.map(v=><li key={v.version}><strong>Version {v.version}{v.version===s.persona?.version?' · Current':''}</strong><small>{v.createdAt?.slice(0,16).replace('T',' ')}</small><p>{v.note||'Personality preferences saved.'}</p></li>)}</ol>:<p>Change history could not be read. <button onClick={()=>void card.openTab('activity')}>Retry history</button></p>}</section></div>;
}
function MemoryRules({card}:{card:AgentCardController}){
 const s=useSyncExternalStore(card.subscribe,card.getSnapshot,card.getSnapshot),d=s.permissionDraft,busy=s.phase==='saving'||s.phase==='loading';
 if(!d)return <p role="status">Reading memory rules…</p>;
 return <section className="card-section"><table className="perm-table"><thead><tr><th>Memory</th><th>Read</th><th>Write</th></tr></thead><tbody>{drawerKinds.map(k=><tr key={k}><th>{drawerLabel({kind:k as never})}</th><td><input type="checkbox" aria-label={`Read ${k}`} checked={d.memoryRead.includes(k)} disabled={busy} onChange={()=>card.toggleDrawer(k,'read')}/></td><td><input type="checkbox" aria-label={`Write ${k}`} checked={d.memoryWrite.includes(k)} disabled={busy} onChange={()=>card.toggleDrawer(k,'write')}/></td></tr>)}</tbody></table><label className="check"><input type="checkbox" checked={d.sharedMemory} disabled={busy} onChange={e=>card.setShared(e.target.checked)}/>Share what it learns with the team</label><button className="primary" disabled={busy||!card.permissionsChanged()} onClick={()=>void card.savePermissions(false)}>Save memory rules</button><button disabled={busy||!card.permissionsChanged()} onClick={()=>card.discardPermissions()}>Discard memory rules</button></section>;
}
const noopSubscribe = () => () => {};
const noSnapshot = () => undefined;

/** The agent's default model: installed local models, and Claude only when a key exists. */
function ModelField({ card, busy }: { card: AgentCardController; busy: boolean }) {
  const s = useSyncExternalStore(card.subscribe, card.getSnapshot, card.getSnapshot);
  const models = s.models ?? [];
  const current = s.profile.model;
  const known = models.some(m => m.id === current);
  const claudeWithoutKey = s.agent?.provider === 'claude' && !models.some(m => m.provider === 'claude');
  return <label className="field"><span>Model</span>
    <select value={current} disabled={busy || !models.length} onChange={e => card.editProfile({ model: e.target.value })}>
      {!known && <option value={current}>{current || 'Not set'}{claudeWithoutKey ? ' (no Claude key: answers use the local model)' : ''}</option>}
      {models.some(m => m.provider === 'ollama') && <optgroup label="On this computer">{models.filter(m => m.provider === 'ollama').map(m => <option key={m.id} value={m.id}>{m.label}{m.size ? ` · ${m.size}` : ''}</option>)}</optgroup>}
      {models.some(m => m.provider === 'claude') && <optgroup label="Claude (paid)">{models.filter(m => m.provider === 'claude').map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>}
    </select>
    {claudeWithoutKey && <small className="fine-print">This agent is set to Claude but no Claude key is saved, so it answers with the local model. Pick a local model here to make that explicit.</small>}
  </label>;
}

const noop = () => () => {};
const none = () => undefined;
