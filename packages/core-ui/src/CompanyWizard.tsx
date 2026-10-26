import {PersonalityPicker} from './PersonalityLibrary';
import {TeamResourceReview} from './TeamResourceReview';
import {DepartmentTile} from './StaffDirectory';
import {IconButton,Sheet} from './desktop-ui';
import {libraryRpc,P,type Entry} from './personality-library';
import {UiIcon} from './ui-icons';
import {departmentIcon,departmentTone,tileStyle} from './agent-look';
import { Fragment,useEffect,useRef,useState, useSyncExternalStore } from 'react';
import type { PointerEvent as PointerEv, KeyboardEvent as KeyEv } from 'react';
import { allPresets, allRoles, presetLabel, roleLabel } from './hire';
import type { Preset, Role } from './hire';
import { shareRoles, sharesTotal, shareSpecialties } from './company';
import { validSpecialties } from './hire-contract.js';
import type { Specialty, SpecialtyChoice, BatchProgress, CompanyController, PlannedHire, Share } from './company';
import { movePeople, rolesSummary } from './team-split';
import type { TeamRole } from './team-split';

const steps = [
  { key: 'size', label: 'Size' }, { key: 'departments', label: 'Departments' },
  { key: 'review', label: 'Your team' }, { key: 'hiring', label: 'Hire' },
] as const;
const statusLabel: Record<PlannedHire['status'], string> = { planned: '', creating: 'Hiring…', created: 'Hired', failed: 'Not hired', unknown: 'Unknown' };

/** Build the company: size, departments, a proposed team to review, then one confirm. */
export function CompanyWizard({ controller, onClose }: { controller: CompanyController; onClose: () => void }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  const [query,setQuery]=useState('');
  const [custom, setCustom] = useState('');
  const [total, setTotal] = useState('');
  const busy = ['loading', 'planning', 'hiring'].includes(s.phase);
  const current = s.step === 'done' ? steps.length : steps.findIndex(x => x.key === s.step);
  const known = new Set(s.catalogue?.departments.map(d => d.id) ?? []);
  const customs = s.departments.filter(d => !known.has(d));
  const chosen = s.hires.filter(h => h.include);
  const groups = [...new Set(s.hires.map(h => h.department))];
  const bulk = s.total !== undefined || s.shares.length > 0 || !!s.batch;
  return <dialog ref={dialog} className="company-wizard" aria-label="Build your company" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><section aria-label="Company setup" className="hire company">
    <div className="hire-head">
      <h3>Build your company</h3>
      <ol className="hire-steps ag-steps" aria-label="Steps">{steps.map((x, i) =>
        <li key={x.key} aria-current={x.key === s.step ? 'step' : undefined} data-done={i < current ? 'true' : undefined}>
          <span className="hire-step-n" aria-hidden="true">{i < current ? '✓' : i + 1}</span>{x.label}
        </li>)}
      </ol>
      <IconButton icon="close" label="Back to team" disabled={busy} onClick={onClose}/>
    </div>
    {(s.notice || busy) && <p role="status">{s.notice ?? (s.phase === 'loading' ? 'Reading the departments…' : s.phase === 'planning' ? (bulk ? 'Splitting your team…' : 'Proposing a team…') : 'Hiring your team…')}</p>}

    {s.step === 'size' && <div className="hire-form">
      <p>How many agents do you want in your company? Pick a number or type your own. Dpro splits them over the departments you choose, and you review the split before any agent is hired.</p>
      {!s.catalogue
        ? <div className="hire-actions"><button type="button" className="primary" disabled={busy || !s.owner} onClick={() => void controller.loadCatalogue()}>Start</button></div>
        : <>
          <ul className="company-counts" aria-label="Number of agents">{agentCounts.map(n =>
            <li key={n}><button type="button" className="company-count-choice" aria-pressed={s.total === n} disabled={busy} onClick={() => { setTotal(''); controller.chooseTotal(n); }}>
              <strong>{n}</strong><small>agents</small>
            </button></li>)}
          </ul>
          <form className="company-add company-total" onSubmit={e => { e.preventDefault(); controller.chooseTotal(Number(total)); }}>
            <label>Custom number of agents<input type="number" inputMode="numeric" min={1} max={s.catalogue.maxTotal ?? 1000} step={1} value={total} placeholder={`1 to ${s.catalogue.maxTotal ?? 1000}`} disabled={busy} onChange={e => setTotal(e.target.value)}/></label>
            <button type="submit" disabled={busy || !total.trim()}>Use this number</button>
          </form>
        </>}
      {s.open.length > 0 && <section className="company-open" aria-label="Unfinished hiring">
        <h4>Unfinished hiring</h4>
        <ul>{s.open.map(b => <li key={b.id}>
          <span>{b.created} of {b.total} hired{b.failed ? ` · ${b.failed} not hired` : ''}</span>
          <button type="button" className="primary" disabled={busy} onClick={() => void controller.resume(b.id)}>Resume</button>
        </li>)}</ul>
      </section>}
    </div>}

    {s.step === 'departments' && s.catalogue && <div className="hire-form">
      <p>{s.total !== undefined ? `Choose the departments for your ${s.total} ${s.total === 1 ? 'agent' : 'agents'}. Dpro splits them by the size each department usually needs; you can change every count.` : 'Choose the departments you want. Each one gets its own small team.'}</p>
      <label>Suggest departments<select aria-label="Suggested company profile" disabled={busy} defaultValue="" onChange={e=>controller.chooseProfile(e.target.value)}><option value="">Choose a company profile…</option><option value="education">Education, languages and integration</option><option value="software">Software company</option><option value="creative">Creative studio</option></select></label><label>Search departments<input type="search" aria-label="Search departments" value={query} onChange={e=>setQuery(e.target.value)}/></label><p className="fine-print">{s.departments.length} selected · up to 72 per plan. Department selection does not make pending specialty packages executable.</p>
      <ul className="company-departments" aria-label="Departments">{s.catalogue.departments.filter(d=>`${d.label} ${d.summary}`.toLowerCase().includes(query.toLowerCase())).map(d => {
        const on = s.departments.includes(d.id);
        return <li key={d.id}><button type="button" className="company-dep" aria-pressed={on} disabled={busy} onClick={() => controller.toggleDepartment(d.id)}><DepartmentTile department={d.label} size={26}/>
          <strong>{d.label}</strong><small>{d.summary}</small>
        </button></li>;
      })}</ul>
      {customs.length > 0 && <p className="fine-print">Your own departments: {customs.map(c => <span key={c} className="badge company-custom">{c} <button type="button" aria-label={`Remove ${c}`} title={`Remove ${c}`} onClick={() => controller.toggleDepartment(c)}><UiIcon name="close" size={12}/></button></span>)}</p>}
      <form className="company-add" onSubmit={e => { e.preventDefault(); if (controller.addCustom(custom)) setCustom(''); }}>
        <label>Add your own department<input value={custom} maxLength={64} placeholder="e.g. podcast studio" disabled={busy} onChange={e => setCustom(e.target.value)}/></label>
        <button type="submit" disabled={busy || !custom.trim()}>Add</button>
      </form>
      <div className="hire-actions">
        <button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
        <button type="button" className="primary" disabled={busy || !s.departments.length} onClick={() => void controller.propose()}>{s.total !== undefined ? `Split ${s.total} agents over ${s.departments.length} ${s.departments.length === 1 ? 'department' : 'departments'}` : `Propose my team (${s.departments.length})`}</button>
      </div>
    </div>}

    {s.step==='review'&&<TeamResourceReview client={controller.client} departments={[...s.departments]} roles={(bulk?s.shares.flatMap(x=>shareSpecialties(x).map(r=>({department:x.department,name:r.name}))):s.hires.filter(h=>h.include).map(h=>({department:h.department,name:h.title}))).filter(r=>r.name.trim()).slice(0,300)}/>}
    {(s.step==='done'||s.phase==='stopped')&&s.boardSetup&&<p role="status">{s.boardSetup==='ready'?'Company and department boards are ready. Skills and MCP permissions still need individual review.':s.boardSetup==='syncing'?'Preparing department boards…':s.boardSetup==='error'?<>Agents are kept. Board setup needs another attempt. <button onClick={()=>void controller.setupBoards()}>Retry board setup</button></>:null}</p>}
    {bulk && s.step === 'review' && <TeamEditor shares={s.shares} busy={busy} controller={controller}/>}
    {bulk && (s.step === 'hiring' || s.step === 'done') && <BatchView batch={s.batch} shares={s.shares} phase={s.phase} busy={busy} controller={controller} onClose={onClose}/>}

    {!bulk && (s.step === 'review' || s.step === 'hiring' || s.step === 'done') && <div className="hire-form">
      {s.step === 'review' && <p>Here is the proposed team. Rename anyone, change their role or personality, or untick agents you don't need. Each hire starts with memory tools only; give more permissions on the agent later.</p>}
      {s.step === 'done' && <p>{chosen.length} new {chosen.length === 1 ? 'agent has' : 'agents have'} joined your team.</p>}
      {groups.map(dep => {
        const list = s.hires.filter(h => h.department === dep);
        return <section key={dep} className="company-group" aria-label={list[0].departmentLabel}>
          <h4>{list[0].departmentLabel}</h4>
          <ul className="company-hires">{list.map(h => <HireRow key={h.key} hire={h} locked={busy || s.step !== 'review' || h.status === 'created'} controller={controller}/>)}</ul>
        </section>;
      })}
      <div className="hire-actions">
        {s.step === 'review' && <>
          <button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
          <button type="button" className="primary" disabled={busy || !chosen.some(h => h.status !== 'created')} onClick={() => void controller.hireAll()}>Hire {chosen.filter(h => h.status !== 'created').length} {chosen.filter(h => h.status !== 'created').length === 1 ? 'agent' : 'agents'}</button>
        </>}
        {(s.step === 'done' || s.phase === 'stopped') && <button type="button" className={s.step === 'done' ? 'primary' : undefined} disabled={busy} onClick={onClose}>Back to team</button>}
      </div>
    </div>}
  </section></dialog>;
}

/** AG4b: the team as a picture, one coloured band per department sized by its people. Drag (or arrow keys on) the line between two bands to move people; click a band to change it. */
export function TeamPicture({ shares, busy = false, onOpen, onMove }: { shares: readonly Share[]; busy?: boolean; onOpen?: (department: string) => void; onMove?: (left: Share, right: Share, counts: [number, number]) => void }) {
  const total = sharesTotal(shares);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; right: number; last: number } | null>(null);
  const down = (i: number) => (e: PointerEv<HTMLSpanElement>) => {
    if (busy || !onMove) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, left: shares[i].count, right: shares[i + 1].count, last: 0 };
  };
  const move = (i: number) => (e: PointerEv<HTMLSpanElement>) => {
    const d = drag.current, width = box.current?.clientWidth ?? 0; if (!d || !width || !onMove) return;
    const people = Math.round((e.clientX - d.x) * total / width); if (people === d.last) return;
    d.last = people; onMove(shares[i], shares[i + 1], movePeople(d.left, d.right, people));
  };
  const key = (i: number) => (e: KeyEv<HTMLSpanElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!step || busy || !onMove) return;
    e.preventDefault(); onMove(shares[i], shares[i + 1], movePeople(shares[i].count, shares[i + 1].count, step));
  };
  return <div ref={box} className="ag-team-picture" aria-label={`${total} agents over ${shares.length} departments`}>{shares.map((x, i) => { const tone = departmentTone(x.departmentLabel);
    return <Fragment key={x.department}>
      <button type="button" className="ag-band" disabled={!onOpen} style={{ flexGrow: Math.max(1, x.count), ...tileStyle(tone) }} aria-label={`${x.departmentLabel}: ${x.count} ${x.count === 1 ? 'agent' : 'agents'}. Change…`} onClick={() => onOpen?.(x.department)}>
        <span><UiIcon name={departmentIcon(x.departmentLabel)} size={14}/>{x.departmentLabel}</span><b>{x.count}</b><small>{rolesSummary(shareRoles(x))}</small>
      </button>
      {onMove && i < shares.length - 1 && <span className="ag-band-line" role="separator" tabIndex={busy ? -1 : 0} aria-orientation="vertical" aria-label={`Move people between ${x.departmentLabel} and ${shares[i + 1].departmentLabel}`}
        aria-valuemin={1} aria-valuemax={x.count + shares[i + 1].count - 1} aria-valuenow={x.count} title="Drag to move people" data-busy={busy || undefined}
        onPointerDown={down(i)} onPointerMove={move(i)} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={key(i)}/>}
    </Fragment>; })}</div>;
}

/** Ready-made company sizes, in agents (any other number is typed in). */
const agentCounts = [5, 10, 25, 50, 100, 250, 500] as const;

function HireRow({ hire, locked, controller }: { hire: PlannedHire; locked: boolean; controller: CompanyController }) {
  return <li className="company-hire" data-status={hire.status}>
    <input type="checkbox" aria-label={`Hire ${hire.name || hire.title}`} checked={hire.include} disabled={locked} onChange={e => controller.edit(hire.key, { include: e.target.checked })}/>
    <span className="team-avatar" aria-hidden="true">{(hire.name || '?').trim().slice(0, 1).toUpperCase() || '?'}</span>
    <div className="company-hire-main">
      <input className="company-name" aria-label={`Name for ${hire.title}`} value={hire.name} maxLength={80} disabled={locked} onChange={e => controller.edit(hire.key, { name: e.target.value })}/>
      <small>{hire.title}</small>
    </div>
    <select aria-label={`Role for ${hire.title}`} value={hire.role} disabled={locked} onChange={e => controller.edit(hire.key, { role: e.target.value as Role })}>
      {allRoles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
    </select>
    <select aria-label={`Personality for ${hire.title}`} title="Personality" value={hire.preset} disabled={locked} onChange={e => controller.edit(hire.key, { preset: e.target.value as Preset })}>
      {allPresets.map(p => <option key={p} value={p}>{presetLabel[p]}</option>)}
    </select>
    <span className="company-status">{hire.status === 'planned' ? '' : <span className="badge">{statusLabel[hire.status]}{hire.note ? ` · ${hire.note}` : ''}</span>}</span>
  </li>;
}

const teamRoleOrder: readonly TeamRole[] = ['manager', 'specialist', 'evaluator'];
export const teamRoleLabel: Record<TeamRole, string> = { manager: 'Managers', specialist: 'Specialists', evaluator: 'Reviewers' };

/** The library personalities for the split; a role without one gets the balanced default (as the picker did). */
function useLibrary(client: CompanyController['client'], shares: readonly Share[], busy: boolean, controller: CompanyController) {
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => { let live = true; void libraryRpc<{ personalities: Entry[] }>(client, 'GET', P).then(r => { if (live) setEntries(r.personalities.filter(e => !e.archived)); }).catch(() => {}); return () => { live = false; }; }, [client]);
  useEffect(() => {
    const fallback = entries.find(e => e.id === 'temperament-balanced'); if (!fallback || busy) return;
    for (const x of shares) { const roles = shareRoles(x); for (const r of teamRoleOrder) if (roles[r] > 0 && !x.personalities?.[r]) controller.editShare(x.department, { role: r, personality: { id: fallback.id, revision: fallback.revision } }); }
  }, [entries, shares, busy, controller]);
  return entries;
}

/** One line of personalities per role: "Managers: Balanced · Specialists: Calm". */
export function personalityLine(share: Share, entries: readonly Pick<Entry, 'id' | 'profile'>[]) {
  const roles = shareRoles(share);
  return teamRoleOrder.filter(r => roles[r] > 0).map(r => `${teamRoleLabel[r]}: ${entries.find(e => e.id === share.personalities?.[r]?.id)?.profile.name ?? presetLabel[share.presets[r]]}`).join(' · ');
}

/** AG4b "Your team": the picture is the editor; each department's count, personalities and specialties change in its "Change…" sheet. */
function TeamEditor({ shares, busy, controller }: { shares: readonly Share[]; busy: boolean; controller: CompanyController }) {
  const total = sharesTotal(shares);
  const [open, setOpen] = useState<string | null>(null);
  const entries = useLibrary(controller.client, shares, busy, controller);
  const share = shares.find(x => x.department === open);
  return <div className="hire-form">
    <p>{total} {total === 1 ? 'agent' : 'agents'} over {shares.length} {shares.length === 1 ? 'department' : 'departments'}. Drag the line between two departments to move people; click a department to set its specialties and personalities. Names are picked when each agent is hired, and each starts with memory tools only.</p>
    {shares.length > 0 && <TeamPicture shares={shares} busy={busy} onOpen={setOpen} onMove={(a, b, [left, right]) => { controller.editShare(a.department, { count: left }); controller.editShare(b.department, { count: right }); }}/>}
    <ul className="company-shares ag-share-lines" aria-label="Departments and headcount">{shares.map(x =>
      <li key={x.department} className="ag-share-line"><DepartmentTile department={x.departmentLabel} size={22}/>
        <span><strong>{x.departmentLabel} · {x.count} {x.count === 1 ? 'agent' : 'agents'}</strong><small>{shareSpecialties(x).filter(r => r.count > 0).map(r => `${r.name} × ${r.count}`).join(' · ') || rolesSummary(shareRoles(x))}</small><small>{personalityLine(x, entries)}</small></span>
        {!validSpecialties(x.specialties, x.count) && <span className="badge">Check specialties</span>}
        <button type="button" disabled={busy} onClick={() => setOpen(x.department)}>Change…</button>
      </li>)}</ul>
    <p className="company-total-line"><strong>{total}</strong> {total === 1 ? 'agent' : 'agents'} in total</p>
    <div className="hire-actions">
      <button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
      <button type="button" className="primary" disabled={busy || !total || shares.some(x=>!validSpecialties(x.specialties,x.count))} onClick={() => void controller.hireBatch()}>Hire {total} {total === 1 ? 'agent' : 'agents'}</button>
    </div>
    {share && <ShareSheet share={share} busy={busy} controller={controller} entries={entries} onClose={() => setOpen(null)}/>}
  </div>;
}

/** "Change…" for one department: its count, the personality per role, its specialties and the agents it will get. */
function ShareSheet({ share: x, busy, controller, entries, onClose }: { share: Share; busy: boolean; controller: CompanyController; entries: readonly Entry[]; onClose: () => void }) {
  const roles = shareRoles(x);
  return <Sheet wide title={`Change ${x.departmentLabel}`} onClose={onClose} actions={<button type="button" className="primary" onClick={onClose}>Done</button>}>
    <div className="company-share-head">
      <label className="company-count">Agents<input type="number" inputMode="numeric" min={1} max={1000} step={1} aria-label={`Agents in ${x.departmentLabel}`} value={x.count} disabled={busy}
        onChange={e => { const n = Number(e.target.value); if (Number.isSafeInteger(n) && n >= 1) controller.editShare(x.department, { count: n }); }}/></label>
      <small>{rolesSummary(roles)}</small>
    </div>
    <div className="company-share-personas">{teamRoleOrder.filter(r => roles[r] > 0).map(r =>
      <div key={r}><strong>{teamRoleLabel[r]}</strong><PersonalityPicker client={controller.client} value={x.personalities?.[r]} defaultId="temperament-balanced" disabled={busy} onPick={entry=>controller.editShare(x.department,{role:r,personality:{id:entry.id,revision:entry.revision}})}/></div>)}
    </div>
    <SpecialtyEditor share={x} busy={busy} controller={controller}/>
    <details className="company-people"><summary>Show the {x.count} {x.count === 1 ? 'agent' : 'agents'}</summary>
      <ul>{teamRoleOrder.filter(r => roles[r] > 0).map(r => <li key={r}>{roles[r]} × {x.titles[r]} · {entries.find(e => e.id === x.personalities?.[r]?.id)?.profile.name ?? presetLabel[x.presets[r]]}</li>)}</ul>
    </details>
  </Sheet>;
}

function SpecialtyEditor({share,busy,controller}:{share:Share;busy:boolean;controller:CompanyController}){
 const [choice,setChoice]=useState('');
 const rows=shareSpecialties(share),all=controller.getSnapshot().catalogue?.specialties??[],choices=all.filter(s=>s.department===share.department),allocated=rows.reduce((sum,row)=>sum+row.count,0),valid=validSpecialties(rows,share.count);
 const update=(index:number,patch:Partial<Specialty>)=>controller.editSpecialties(share.department,rows.map((row,i)=>i===index?{...row,...patch}:row));
 const add=(option?:SpecialtyChoice)=>{if(rows.length>=50)return;controller.editSpecialties(share.department,[...rows,{name:option?.name??'',description:option?.description??'',count:0}]);setChoice('');};
 return <section className="company-specialties" aria-label={`Specialties in ${share.departmentLabel}`}><h5>Specialties</h5><p className="fine-print" role="status">{allocated} of {share.count} allocated{!valid?' · Review names and counts before hiring.':''}</p>
 <ul className="specialty-rows">{rows.map((row,index)=><li key={index}><div className="specialty-fields"><label>Specialty name<input aria-label={`Specialty ${index+1} name in ${share.departmentLabel}`} value={row.name} maxLength={80} disabled={busy} onChange={e=>update(index,{name:e.target.value})}/></label><label>Agents<input type="number" min={0} max={share.count} step={1} aria-label={`Specialty ${index+1} count in ${share.departmentLabel}`} value={row.count} disabled={busy} onChange={e=>{const count=Number(e.target.value);if(Number.isSafeInteger(count)&&count>=0&&count<=1000)update(index,{count});}}/></label><button type="button" disabled={busy} aria-label={`Remove specialty ${index+1} in ${share.departmentLabel}`} onClick={()=>controller.editSpecialties(share.department,rows.filter((_,i)=>i!==index))}>Remove</button></div><label>Description<textarea aria-label={`Specialty ${index+1} description in ${share.departmentLabel}`} value={row.description} maxLength={1800} rows={2} disabled={busy} onChange={e=>update(index,{description:e.target.value})}/></label></li>)}</ul>
 <div className="specialty-add"><label>Suggested specialty<select aria-label={`Suggested specialty in ${share.departmentLabel}`} value={choice} disabled={busy||rows.length>=50} onChange={e=>setChoice(e.target.value)}><option value="">Choose a specialty</option>{(choices.length?choices:all).filter(option=>!rows.some(row=>row.name.trim().toLowerCase()===option.name.toLowerCase())).map(option=><option key={option.department+option.name} value={option.name}>{option.name}</option>)}</select></label><button type="button" disabled={busy||!choice||rows.length>=50} onClick={()=>add(all.find(option=>option.name===choice))}>Add specialty</button><button type="button" disabled={busy||rows.length>=50} onClick={()=>add()}>Add custom specialty</button></div><p className="fine-print">Zero-count specialties are not hired. Counts must match this department. Specialties do not grant skills or tools.</p>
 </section>;
}

/** Progress of a batch hire; Continue is always safe (nobody is hired twice). */
function BatchView({ batch, shares, phase, busy, controller, onClose }: { batch?: BatchProgress; shares: readonly Share[]; phase: string; busy: boolean; controller: CompanyController; onClose: () => void }) {
  const label = (dep: string) => shares.find(x => x.department === dep)?.departmentLabel ?? dep.replace(/^./, c => c.toUpperCase());
  return <div className="hire-form">
    {batch ? <>
      <p>{batch.done && !batch.failed ? `${batch.created} new ${batch.created === 1 ? 'agent has' : 'agents have'} joined your team.` : `${batch.created} of ${batch.total} hired${batch.failed ? `, ${batch.failed} not hired` : ''}.`}</p>
      <progress className="company-progress" max={batch.total} value={batch.created} aria-label="Hiring progress">{batch.created} of {batch.total}</progress>
      <ul className="company-batch-deps" aria-label="Progress per department">{batch.departments.map(d =>
        <li key={d.department}><span>{label(d.department)}</span><span>{d.created} / {d.total}{d.failed ? ` · ${d.failed} not hired` : ''}</span></li>)}
      </ul>
    </> : <p>Starting the hire…</p>}
    <div className="hire-actions">
      {phase === 'stopped' && batch && batch.failed > 0 && batch.pending === 0 && <button type="button" className="primary" disabled={busy} onClick={() => void controller.retryFailed()}>Try the {batch.failed} again</button>}
      {(phase === 'stopped' || phase === 'error') && !(batch && batch.done) && <button type="button" className="primary" disabled={busy} onClick={() => void controller.continueBatch()}>Continue</button>}
      {!busy && <button type="button" className={phase === 'done' ? 'primary' : undefined} onClick={onClose}>Back to team</button>}
    </div>
  </div>;
}
