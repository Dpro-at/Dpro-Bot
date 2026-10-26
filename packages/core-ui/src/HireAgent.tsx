import {defaultLibraryId} from './personality-library';
import {PersonalityFaces} from './AgentPersonalityLibrary';
import {DepartmentTile} from './StaffDirectory';
import {IconButton} from './desktop-ui';
import {UiIcon} from './ui-icons';
import type {UiIconName} from './ui-icons';
import {ROLE_CARDS} from './agent-look';
import { AgentWorksOn } from './AgentWorksOn';
import {SpecialtyLibrary} from './SpecialtyLibrary';
import { useState, useSyncExternalStore } from 'react';
import {
  allCategories, allDrawerKinds, allRoles, careLevels, careOf, categoryLabel, drawerKindLabel, isRisky, memoryTool, modeLabel,
  normalizedDepartment, normalizedName, roleHelp, roleLabel,
} from './hire';
import type { Care, HireController, Permissions, Tool } from './hire';

const steps = [
  { key: 'role', label: 'Who' }, { key: 'persona', label: 'Personality' }, { key: 'care', label: 'How careful' },
] as const;
const phaseLabel: Record<string, string> = {
  editing: 'Nothing is saved until you hire', creating: 'Hiring…', loading: 'Reading permissions…', saving: 'Saving…',
  done: 'Hired', error: 'Something went wrong', unknown: 'Outcome unknown', denied: 'Owner only',
};
const careIcon: Record<Care, UiIconName> = { careful: 'shield', normal: 'check', trusted: 'star' };
const askWords: Record<string, string> = { browser: 'browsing', network: 'going online', message: 'sending', delete: 'deleting', install: 'installing', money: 'spending', settings: 'changing settings' };

/**
 * AG4a: hire an agent in three short steps — Who · Personality · How careful.
 * Who and Personality become one create request; "How careful" fills the
 * memory and permission fields (Details shows every switch) and is one save.
 */
export function HireAgent({ controller, onClose, onOpen }: { controller: HireController; onClose: () => void; onOpen?: (agentId: string) => void }) {
  const [templateMode,setTemplateMode]=useState(false);
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const busy = ['creating', 'loading', 'saving'].includes(s.phase);
  const locked = !s.owner || busy || !!s.agent;
  const d = s.draft;
  const step = s.step === 'memory' || s.step === 'permissions' ? 'care' : s.step;
  const current = steps.findIndex(x => x.key === step);
  const memory = s.tools.filter(t => memoryTool(t.name));
  const other = s.tools.filter(t => !memoryTool(t.name));
  const who = s.agent?.name ?? (normalizedName(d.name) || 'The new agent');
  const care = careOf(s.permissions);
  const asks = s.permissions ? allCategories.filter(c => s.permissions!.modes[c] === 'ask').map(c => askWords[c]) : [];
  const risky = controller.riskyAllowed();
  return <section aria-label="Hire an agent" className="hire ag-hire">
    <div className="hire-head">
      <h3>Hire an agent</h3>
      {step === 'role' && s.owner && <button type="button" className="link-button" disabled={locked} aria-pressed={templateMode} onClick={() => setTemplateMode(v => !v)}>{templateMode ? 'Fill it in myself' : 'From a specialty instead…'}</button>}
      <IconButton icon="close" label="Close" disabled={busy} onClick={onClose}/>
    </div>
    {step !== 'done' && <ol className="hire-steps ag-steps" aria-label="Steps">{steps.map((x, i) =>
      <li key={x.key} aria-current={x.key === step ? 'step' : undefined} data-done={i < current ? 'true' : undefined}>
        <span className="hire-step-n" aria-hidden="true">{i < current ? '✓' : i + 1}</span>{x.label}
      </li>)}
    </ol>}
    {(s.notice || busy || s.phase === 'error' || s.phase === 'unknown' || (s.agent && s.phase === 'editing')) && <p role="status" className="ag-muted">{s.notice ?? (s.agent && s.phase === 'editing' ? 'Hired — choose how careful it is, then finish' : phaseLabel[s.phase] ?? s.phase)}</p>}

    {step==='role'&&templateMode&&<SpecialtyLibrary client={controller.client} hire onHired={onClose}/>}
    {step === 'role' && !templateMode && <form className="hire-form" onSubmit={e => { e.preventDefault(); controller.go('persona'); }}>
      <label>Name<input value={d.name} maxLength={80} disabled={locked} placeholder="Leave empty for a generated name" onChange={e => controller.edit({ name: e.target.value })}/></label>
      <div role="radiogroup" aria-label="Role in the team" className="ag-roles">
        {allRoles.map(r => { const c = ROLE_CARDS.find(x => x.key === r); return <label key={r} className="ag-role" data-on={d.role === r || undefined}>
          <input type="radio" name="hire-role" aria-label={roleLabel[r]} checked={d.role === r} disabled={locked} onChange={() => controller.edit({ role: r })}/>
          <UiIcon name={c?.icon ?? 'star'} size={17}/><b>{roleLabel[r]}</b><small>{roleHelp[r]}</small>
        </label>; })}
      </div>
      <label>Department<span className="ag-picker"><DepartmentTile department={normalizedDepartment(d.department) || null} size={20}/><input value={d.department} maxLength={64} disabled={locked} placeholder="e.g. marketing, finance, development" onChange={e => controller.edit({ department: e.target.value })}/></span></label>
      <label>Job description<textarea value={d.description} maxLength={500} disabled={locked} placeholder="What this agent is responsible for" onChange={e => controller.edit({ description: e.target.value })}/></label>
      <div className="hire-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="primary" disabled={locked}>Next</button></div>
    </form>}

    {step === 'persona' && <form className="hire-form" onSubmit={e => { e.preventDefault(); void controller.create(); }}>
      <PersonalityFaces client={controller.client} value={d.libraryPersonality?.id} disabled={locked} autoPick={defaultLibraryId(d.role, d.department)} onPick={entry => controller.edit({ libraryPersonality: { id: entry.id, revision: entry.revision } })}/>
      <p className="fine-print">A personality changes how it talks, never its tools or permissions. Edit the library in Personalities.</p>
      <div className="hire-actions">
        <button type="button" disabled={locked} onClick={() => controller.go('role')}>Back</button>
        <button type="submit" className="primary" disabled={locked || !d.libraryPersonality || s.phase === 'unknown'}>Next</button>
      </div>
    </form>}

    {step === 'care' && <div className="hire-form">
      {s.permissions && <div role="radiogroup" aria-label="How careful" className="ag-care">{careLevels.map(c => <label key={c.key} className="ag-role" data-on={care === c.key || undefined}>
        <input type="radio" name="hire-care" aria-label={c.title} checked={care === c.key} disabled={busy || s.phase === 'unknown'} onChange={() => controller.applyCare(c.key)}/>
        <UiIcon name={careIcon[c.key]} size={18}/><b>{c.title}</b><small>{c.text}</small></label>)}</div>}
      <details className="ag-details"><summary>Details: memory places, projects it works on, each action and tool</summary>
        <ToolList tools={memory} selected={s.selected} disabled={busy || s.phase === 'unknown'} onToggle={t => controller.toggle(t)} empty="No memory tools on this server."/>
        {s.permissions && <MemoryScope controller={controller} p={s.permissions} disabled={busy || s.phase === 'unknown'}/>}
        {s.agent && <AgentWorksOn client={controller.client} agentId={s.agent.id} agentName={who}/>}
        {s.permissions && <ModeTable controller={controller} p={s.permissions} confirm={s.confirmRisky} disabled={busy || s.phase === 'unknown'}/>}
        <ToolList tools={other} selected={s.selected} disabled={busy || s.phase === 'unknown'} onToggle={t => controller.toggle(t)} empty="No other tools on this server."/>
      </details>
      {risky.length > 0 && <label className="check hire-risky"><input type="checkbox" checked={s.confirmRisky} onChange={e => controller.setConfirmRisky(e.target.checked)}/> I understand that {risky.map(c => categoryLabel[c].toLowerCase()).join(', ')} will run without asking me.</label>}
      {s.permissions && <p className="ag-summary"><bdi>{who}</bdi> will be a {roleLabel[d.role]}{normalizedDepartment(d.department) ? ` in ${normalizedDepartment(d.department)}` : ''}{asks.length ? `, and will ask you before ${asks.join(', ')}` : ', and will work on its own'}.</p>}
      <div className="hire-actions">
        {s.phase === 'unknown'
          ? <button type="button" className="primary" disabled={busy} onClick={() => void controller.reconcile()}>Read permissions again</button>
          : <button type="button" className="primary" disabled={busy || s.grantsVersion === undefined} onClick={() => void controller.save()}>Finish hiring <bdi>{who}</bdi></button>}
      </div>
    </div>}

    {s.step === 'done' && <div className="hire-form">
      <p><bdi>{who}</bdi> joined your team with {s.selected.length} permission{s.selected.length === 1 ? '' : 's'}.</p>
      <div className="hire-actions">
        <button type="button" onClick={() => controller.restart()}>Hire another</button>
        {onOpen && s.agent ? <button type="button" className="primary" onClick={() => onOpen(s.agent!.id)}>Open <bdi>{who}</bdi></button> : <button type="button" className="primary" onClick={onClose}>Back to team</button>}
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
    {risky.length > 0 && <p className="fine-print">{confirm ? 'Confirmed: ' : 'Needs your confirmation below: '}{risky.map(c => categoryLabel[c].toLowerCase()).join(', ')}.</p>}
  </fieldset>;
}
