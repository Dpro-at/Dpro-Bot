import {defaultLibraryId} from './personality-library';
import {PersonalityFaces} from './AgentPersonalityLibrary';
import {DepartmentTile} from './StaffDirectory';
import {IconButton} from './desktop-ui';
import {UiIcon} from './ui-icons';
import type {UiIconName} from './ui-icons';
import {ROLE_CARDS} from './agent-look';
import { AgentWorksOn } from './AgentWorksOn';
import {SpecialtyLibrary} from './SpecialtyLibrary';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  allCategories, allDrawerKinds, allRoles, careLevels, careOf, categoryLabel, drawerKindLabel, isRisky, memoryTool, modeLabel,
  normalizedDepartment, normalizedName, roleLabel,
} from './hire';
import type { Care, HireController, Permissions, Tool } from './hire';

const phaseLabel: Record<string, string> = {
  editing: 'Nothing is saved until you hire', creating: 'Hiring…', loading: 'Reading permissions…', saving: 'Saving…',
  done: 'Hired', error: 'Something went wrong', unknown: 'Outcome unknown', denied: 'Owner only',
};
const careIcon: Record<Care, UiIconName> = { careful: 'shield', normal: 'check', trusted: 'star' };
const askWords: Record<string, string> = { browser: 'browsing', network: 'going online', message: 'sending', delete: 'deleting', install: 'installing', money: 'spending', settings: 'changing settings' };

/** AG4a: one sheet for a new agent; permissions remain reviewable after creation. */
export function HireAgent({ controller, onClose, onOpen }: { controller: HireController; onClose: () => void; onOpen?: (agentId: string) => void }) {
  const [templateMode,setTemplateMode]=useState(false);
  const [suggestingName,setSuggestingName]=useState(false);
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const busy = ['creating', 'loading', 'saving'].includes(s.phase);
  const locked = !s.owner || busy || !!s.agent;
  const d = s.draft;
  const stuck = busy || s.phase === 'unknown';
  const memory = s.tools.filter(t => memoryTool(t.name));
  const other = s.tools.filter(t => !memoryTool(t.name));
  const named = s.agent?.name ?? normalizedName(d.name);
  const who = named || 'The new agent';
  const care = careOf(s.permissions) ?? 'careful';
  const asks = s.permissions ? allCategories.filter(c => s.permissions!.modes[c] === 'ask').map(c => askWords[c]) : [];
  const risky = controller.riskyAllowed();
  const chooseCare = (value: Care) => { if (!controller.getSnapshot().permissions) controller.go('care'); controller.applyCare(value); };
  const hire = () => { if (!controller.getSnapshot().permissions) controller.go('care'); void controller.hire(); };
  const suggestName = async (replaceCurrent = false) => {
    if (suggestingName || locked) return;
    setSuggestingName(true);
    try {
      const response = await controller.client.request({method:'POST',path:'/api/agents/name-suggestion',body:{language:'en',exclude:d.name?[d.name]:[]}} as never);
      const raw = (response.body as {name?:unknown}|null)?.name;
      const safe = typeof raw === 'string' ? normalizedName(raw) : null;
      const currentName = controller.getSnapshot().draft.name;
      if (response.status === 200 && safe && (!currentName || (replaceCurrent && currentName === d.name))) controller.edit({name:safe});
    } catch { /* Keep the editable form available when suggestions are offline. */ }
    finally { setSuggestingName(false); }
  };
  useEffect(() => { if (!d.name && !s.agent) void suggestName(); }, [controller]);
  return <section aria-label="Hire an agent" className="hire ag-hire">
    <div className="hire-head">
      <h3>Hire an agent</h3>
      {!s.agent && s.owner && <button type="button" className="link-button" disabled={locked} aria-pressed={templateMode} onClick={() => setTemplateMode(v => !v)}>{templateMode ? 'Fill it in myself' : 'A specialty…'}</button>}
      <IconButton icon="close" label="Close" disabled={busy} onClick={onClose}/>
    </div>
    {(s.notice || busy || s.phase === 'error' || s.phase === 'unknown') && <p role="status" className="ag-muted">{s.notice ?? phaseLabel[s.phase] ?? s.phase}</p>}

    {templateMode && !s.agent && <SpecialtyLibrary client={controller.client} hire onHired={onClose}/>}
    {!templateMode && !s.agent && <div className="ag-hire-one-page">
      <aside className="ag-hire-preview" aria-label="Agent preview">
        <span className="team-avatar" aria-hidden="true">{(named || '?').trim().slice(0, 1).toUpperCase() || '?'}</span>
        <strong>{named || 'Name chosen when hired'}</strong>
        <span>{roleLabel[d.role]}{normalizedDepartment(d.department) ? ` · ${normalizedDepartment(d.department)}` : ''}</span>
        <span>{d.libraryPersonality ? 'Personality selected' : 'Suggested personality'}</span>
        <span className="badge"><UiIcon name="shield" size={13}/> Careful</span>
      </aside>
      <div className="hire-form">
        <label>What should this agent do?<textarea value={d.description} maxLength={500} disabled={locked} placeholder="Describe the work you want this agent to own" onChange={e => controller.edit({ description: e.target.value })}/></label>
        <label className="ag-hire-name-field">Name<input value={d.name} maxLength={80} disabled={locked} placeholder={suggestingName?'Choosing a name…':'Choose a name'} onChange={e => controller.edit({ name: e.target.value })}/><button type="button" className="tool" disabled={locked||suggestingName} aria-label="Suggest another name" title="Suggest another name" onClick={()=>void suggestName(true)}><UiIcon name="refresh" size={14}/></button></label>
        <div role="radiogroup" aria-label="Job" className="ag-roles ag-role-segmented">
          {allRoles.map(r => { const c = ROLE_CARDS.find(x => x.key === r); return <label key={r} className="ag-role" data-on={d.role === r || undefined}>
            <input type="radio" name="hire-role" aria-label={roleLabel[r]} checked={d.role === r} disabled={locked} onChange={() => controller.edit({ role: r })}/>
            <UiIcon name={c?.icon ?? 'star'} size={16}/><b>{roleLabel[r]}</b>
          </label>; })}
        </div>
        <label>Department<span className="ag-picker"><DepartmentTile department={normalizedDepartment(d.department) || null} size={20}/><input value={d.department} maxLength={64} disabled={locked} placeholder="Choose a department" onChange={e => controller.edit({ department: e.target.value })}/></span></label>
        <section className="ag-hire-personality" aria-label="Personality"><h4>Personality</h4>
          <PersonalityFaces client={controller.client} value={d.libraryPersonality?.id} disabled={locked} autoPick={defaultLibraryId(d.role, d.department)} onPick={entry => controller.edit({ libraryPersonality: { id: entry.id, revision: entry.revision } })}/>
          <p className="fine-print">Personality changes how the agent talks, not what it can do.</p>
        </section>
        <fieldset className="ag-hire-care"><legend>How careful</legend><div role="radiogroup" aria-label="How careful" className="ag-care">{careLevels.map(c => <label key={c.key} className="ag-role" data-on={care === c.key || undefined}>
          <input type="radio" name="hire-care" aria-label={c.title} checked={care === c.key} disabled={stuck} onChange={() => chooseCare(c.key)}/><UiIcon name={careIcon[c.key]} size={18}/><b>{c.title}</b><small>{c.text}</small>
        </label>)}</div></fieldset>
        <div className="hire-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={locked || s.phase === 'unknown'} onClick={hire}>{named ? <>Hire <bdi>{named}</bdi></> : 'Hire agent'}</button></div>
      </div>
    </div>}

    {s.agent && s.phase !== 'done' && <div className="hire-form">
      <p><bdi>{who}</bdi> was created. Review its permissions and save to finish hiring.</p>
      {s.permissions && <div role="radiogroup" aria-label="How careful" className="ag-care">{careLevels.map(c => <label key={c.key} className="ag-role" data-on={care === c.key || undefined}>
        <input type="radio" name="hire-care" aria-label={c.title} checked={care === c.key} disabled={stuck} onChange={() => controller.applyCare(c.key)}/><UiIcon name={careIcon[c.key]} size={18}/><b>{c.title}</b><small>{c.text}</small></label>)}</div>}
      <details className="ag-details"><summary>Permissions: memory, projects and tools</summary>
        {s.permissions && <MemoryScope controller={controller} p={s.permissions} disabled={stuck}/>}
        {s.permissions && <ModeTable controller={controller} p={s.permissions} confirm={s.confirmRisky} disabled={stuck}/>}
        <ToolList tools={memory} selected={s.selected} disabled={stuck} onToggle={t => controller.toggle(t)} empty="No memory tools on this server."/>
        {s.agent && <AgentWorksOn client={controller.client} agentId={s.agent.id} agentName={who}/>}
        <ToolList tools={other} selected={s.selected} disabled={stuck} onToggle={t => controller.toggle(t)} empty="No other tools on this server."/>
      </details>
      {risky.length > 0 && <label className="check hire-risky"><input type="checkbox" checked={s.confirmRisky} onChange={e => controller.setConfirmRisky(e.target.checked)}/> I understand that {risky.map(c => categoryLabel[c].toLowerCase()).join(', ')} will run without asking me.</label>}
      {s.permissions && <p className="ag-summary"><bdi>{who}</bdi> will be a {roleLabel[d.role]}{normalizedDepartment(d.department) ? ` in ${normalizedDepartment(d.department)}` : ''}{asks.length ? `, and will ask you before ${asks.join(', ')}` : ', and will work on its own'}.</p>}
      <div className="hire-actions">{s.phase === 'unknown'
        ? <button type="button" className="primary" disabled={busy} onClick={() => void controller.reconcile()}>Read permissions again</button>
        : <button type="button" className="primary" disabled={busy || !s.permissions || s.grantsVersion === undefined} onClick={() => void controller.hire()}>Save permissions</button>}
      </div>
    </div>}
    {s.phase === 'done' && <div className="hire-form"><p><bdi>{who}</bdi> joined your team.</p><div className="hire-actions">
      <button type="button" onClick={() => controller.restart()}>Hire another</button>
      {onOpen && s.agent ? <button type="button" className="primary" onClick={() => onOpen(s.agent!.id)}>Open <bdi>{who}</bdi></button> : <button type="button" className="primary" onClick={onClose}>Back to team</button>}
    </div></div>}
    {s.phase === 'error' && s.agent && s.grantsVersion === undefined && <div className="hire-actions"><button type="button" disabled={busy} onClick={() => void controller.reloadTools()}>Read permissions again</button></div>}
  </section>;
}

function ToolList({ tools, selected, disabled, onToggle, empty }: { tools: readonly Tool[]; selected: readonly string[]; disabled: boolean; onToggle: (name: string) => void; empty: string }) {
  if (!tools.length) return <p className="fine-print">{empty}</p>;
  return <ul className="hire-tools" aria-label="Tools">{tools.map(t => {
    const on = selected.includes(t.name);
    const off = !t.allowedByServer && !on;
    return <li key={t.name}>
      <label className="check hire-tool">
        <input type="checkbox" aria-label={t.name} checked={on} disabled={disabled || off} onChange={() => onToggle(t.name)}/>
        <span className="hire-tool-text">
          <code>{t.name}</code>
          {t.requiresApproval && <span className="badge">Asks you first</span>}
          {!t.allowedByServer && <span className="badge">Off on this server</span>}
          {t.description && <small>{t.description}</small>}
        </span>
      </label>
    </li>;
  })}</ul>;
}

/** CORE-PERMS-01: which memory drawers the agent may read and write. */
function MemoryScope({ controller, p, disabled }: { controller: HireController; p: Permissions; disabled: boolean }) {
  return <fieldset className="hire-scope" disabled={disabled}><legend>Memory drawers</legend>
    <table className="hire-scope-table"><thead><tr><th scope="col">Drawer</th><th scope="col">Read</th><th scope="col">Write</th></tr></thead>
      <tbody>{allDrawerKinds.map(k => {
        const read = p.memoryRead.includes(k); const write = p.memoryWrite.includes(k);
        return <tr key={k}><th scope="row">{drawerKindLabel[k]}</th>
          <td><input type="checkbox" aria-label={`Read ${drawerKindLabel[k]}`} checked={read} onChange={e => controller.setMemory(k, { read: e.target.checked })}/></td>
          <td><input type="checkbox" aria-label={`Write ${drawerKindLabel[k]}`} checked={write} disabled={!read} onChange={e => controller.setMemory(k, { write: e.target.checked })}/></td>
        </tr>;
      })}</tbody>
    </table>
    <label className="check"><input type="checkbox" checked={p.sharedMemory} onChange={e => controller.setShared(e.target.checked)}/> May see memories other agents share with the team</label>
  </fieldset>;
}

/** CORE-PERMS-01: off / ask / allow per kind of tool; Allow on risky kinds needs a confirmation. */
function ModeTable({ controller, p, confirm, disabled }: { controller: HireController; p: Permissions; confirm: boolean; disabled: boolean }) {
  const risky = allCategories.filter(c => isRisky(c) && p.modes[c] === 'allow');
  return <fieldset className="hire-scope" disabled={disabled}><legend>What it may do</legend>
    <ul className="hire-modes">{allCategories.map(c => <li key={c}>
      <span>{categoryLabel[c]}{isRisky(c) && <span className="badge">Risky</span>}</span>
      <span className="hire-mode-choices" role="radiogroup" aria-label={categoryLabel[c]}>{(['off', 'ask', 'allow'] as const).map(m =>
        <label key={m} className="hire-mode"><input type="radio" name={`mode-${c}`} checked={p.modes[c] === m} onChange={() => controller.setMode(c, m)}/>{modeLabel[m]}</label>)}
      </span>
    </li>)}</ul>
    {risky.length > 0 && <p className="fine-print">{confirm ? 'Confirmed: ' : 'Needs your confirmation below: '}{risky.map(c => categoryLabel[c].toLowerCase()).join(', ')}.</p>}
  </fieldset>;
}
