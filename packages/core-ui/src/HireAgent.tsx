import {PersonalityPicker} from './PersonalityLibrary';
import {defaultLibraryId} from './personality-library';
import { AgentWorksOn } from './AgentWorksOn';
import {SpecialtyLibrary} from './SpecialtyLibrary';
import { useState, useSyncExternalStore } from 'react';
import {
  allCategories, allDrawerKinds, allRoles, categoryLabel, drawerKindLabel, isRisky, memoryTool, modeLabel,
  roleHelp, roleLabel,
} from './hire';
import type { HireController, Permissions, Tool } from './hire';

const steps = [
  { key: 'role', label: 'Role' }, { key: 'persona', label: 'Persona' },
  { key: 'memory', label: 'Memory' }, { key: 'permissions', label: 'Permissions' },
] as const;
const phaseLabel: Record<string, string> = {
  editing: 'Draft — nothing is saved until you hire', creating: 'Hiring…', loading: 'Reading permissions…', saving: 'Saving permissions…',
  done: 'Hired', error: 'Something went wrong', unknown: 'Outcome unknown', denied: 'Owner only',
};

/** Hire an agent: role and persona become one create request; memory and permissions are one save. */
export function HireAgent({ controller, onClose }: { controller: HireController; onClose: () => void }) {
  const [templateMode,setTemplateMode]=useState(false);
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const busy = ['creating', 'loading', 'saving'].includes(s.phase);
  const locked = !s.owner || busy || !!s.agent;
  const d = s.draft;
  const current = steps.findIndex(x => x.key === s.step);
  const memory = s.tools.filter(t => memoryTool(t.name));
  const other = s.tools.filter(t => !memoryTool(t.name));
  const who = s.agent?.name ?? 'The new agent';
  return <section aria-label="Hire an agent" className="hire">
    <div className="hire-head">
      <h3>Hire an agent</h3>
      <button type="button" disabled={busy} onClick={onClose}>Back to team</button>
    </div>
    <ol className="hire-steps" aria-label="Steps">{steps.map((x, i) =>
      <li key={x.key} aria-current={x.key === s.step ? 'step' : undefined} data-done={s.step === 'done' || i < current ? 'true' : undefined}>
        <span className="hire-step-n" aria-hidden="true">{i + 1}</span>{x.label}
      </li>)}
    </ol>
    <p role="status">{s.notice ?? (s.agent && s.phase === 'editing' ? 'Hired — choose memory and permissions, then save' : phaseLabel[s.phase] ?? s.phase)}</p>

    {s.step==='role'&&s.owner&&<div className="actions"><button type="button" disabled={locked} aria-pressed={!templateMode} onClick={()=>setTemplateMode(false)}>Configure manually</button><button type="button" disabled={locked} aria-pressed={templateMode} onClick={()=>setTemplateMode(true)}>Choose specialty template</button></div>}
    {s.step==='role'&&templateMode&&<SpecialtyLibrary client={controller.client} hire onHired={onClose}/>}
    {s.step === 'role' && !templateMode && <form className="hire-form" onSubmit={e => { e.preventDefault(); controller.go('persona'); }}>
      <label>Name<input value={d.name} maxLength={80} disabled={locked} placeholder="Leave empty for a generated name" onChange={e => controller.edit({ name: e.target.value })}/></label>
      <fieldset className="hire-choices" disabled={locked}><legend>Role in the team</legend>
        {allRoles.map(r => <label key={r} className="hire-choice">
          <input type="radio" name="hire-role" aria-label={roleLabel[r]} checked={d.role === r} onChange={() => controller.edit({ role: r })}/>
          <span><strong>{roleLabel[r]}</strong><small>{roleHelp[r]}</small></span>
        </label>)}
      </fieldset>
      <label>Department<input value={d.department} maxLength={64} disabled={locked} placeholder="e.g. marketing, finance, development" onChange={e => controller.edit({ department: e.target.value })}/></label>
      <label>Job description<textarea value={d.description} maxLength={500} disabled={locked} placeholder="What this agent is responsible for" onChange={e => controller.edit({ description: e.target.value })}/></label>
      <div className="hire-actions"><button type="submit" className="primary" disabled={locked}>Next: persona</button></div>
    </form>}

    {s.step === 'persona' && <form className="hire-form" onSubmit={e => { e.preventDefault(); void controller.create(); }}>
      <PersonalityPicker client={controller.client} value={d.libraryPersonality} disabled={locked} defaultId={defaultLibraryId(d.role,d.department)} onPick={entry=>controller.edit({libraryPersonality:{id:entry.id,revision:entry.revision}})}/>
      <p className="fine-print">Edit personality settings in Personalities. Tools and permissions stay separate.</p>
      <div className="hire-actions">
        <button type="button" disabled={locked} onClick={() => controller.go('role')}>Back</button>
        <button type="submit" className="primary" disabled={locked || !d.libraryPersonality || s.phase === 'unknown'}>Hire agent</button>
      </div>
    </form>}

    {s.step === 'memory' && <div className="hire-form">
      <p><bdi>{who}</bdi> is hired. Choose what it may do with memory. Memory stays inside your company.</p>
      <ToolList tools={memory} selected={s.selected} disabled={busy || s.phase === 'unknown'} onToggle={t => controller.toggle(t)} empty="No memory tools on this server."/>
      {s.permissions && <MemoryScope controller={controller} p={s.permissions} disabled={busy || s.phase === 'unknown'}/>}
      {s.agent && <AgentWorksOn client={controller.client} agentId={s.agent.id} agentName={who}/>}
      <div className="hire-actions"><button type="button" className="primary" disabled={busy} onClick={() => controller.next()}>Next: permissions</button></div>
    </div>}

    {s.step === 'permissions' && <div className="hire-form">
      <p>Choose how <bdi>{who}</bdi> works with each kind of tool: Off, Ask me first, or Allow. Then pick the tools it may use; tools marked “Asks you first” always wait for your approval.</p>
      {s.permissions && <ModeTable controller={controller} p={s.permissions} confirm={s.confirmRisky} disabled={busy || s.phase === 'unknown'}/>}
      <ToolList tools={other} selected={s.selected} disabled={busy || s.phase === 'unknown'} onToggle={t => controller.toggle(t)} empty="No other tools on this server."/>
      <div className="hire-actions">
        <button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
        {s.phase === 'unknown'
          ? <button type="button" disabled={busy} onClick={() => void controller.reconcile()}>Reload permissions</button>
          : <button type="button" className="primary" disabled={busy || s.grantsVersion === undefined} onClick={() => void controller.save()}>Save permissions</button>}
      </div>
    </div>}

    {s.step === 'done' && <div className="hire-form">
      <p><bdi>{who}</bdi> joined your team with {s.selected.length} permission{s.selected.length === 1 ? '' : 's'}.</p>
      <div className="hire-actions">
        <button type="button" className="primary" onClick={onClose}>Back to team</button>
        <button type="button" onClick={() => controller.restart()}>Hire another</button>
      </div>
    </div>}

    {s.phase === 'error' && s.agent && s.step !== 'done' && s.grantsVersion === undefined &&
      <div className="hire-actions"><button type="button" disabled={busy} onClick={() => void controller.reloadTools()}>Read permissions again</button></div>}
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
    {risky.length > 0 && <label className="check hire-risky"><input type="checkbox" checked={confirm} onChange={e => controller.setConfirmRisky(e.target.checked)}/> I understand that {risky.map(c => categoryLabel[c].toLowerCase()).join(', ')} will run without asking me.</label>}
  </fieldset>;
}
