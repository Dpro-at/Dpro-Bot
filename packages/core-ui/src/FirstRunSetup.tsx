import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { SessionClient } from './session';
import { UiIcon } from './ui-icons';
import { TerminalPane } from './TerminalPane';
import { TerminalPrefsController, TerminalTabs } from './terminal';
import { CompanyController } from './company';
import type { Share } from './company';
import { TeamPicture } from './CompanyWizard';
import { DepartmentTile } from './StaffDirectory';
import { shareRoles, shareSpecialties, sharesTotal } from './company';
import { rolesSummary } from './team-split';
import { AgentsController } from './agents';
import { PersonalityPicker } from './PersonalityLibrary';
import { useAppTheme } from './app-navigation';

/** FIRSTRUN-01 (boards FR2–FR3): the steps after the owner account, in the one setup window. */
export type FirstRunStep = 'tools' | 'model' | 'team';
const STEPS = ['Account', 'AI tools', 'Local model', 'Team'] as const;
type AiTool = { id: 'claude' | 'codex' | 'gemini'; name: string; installed: boolean; signedIn: boolean; install: string | null; signIn: string; needs?: 'node' };
type LocalChoice = { id: string; label: string; sizeGb: number; note: string };
type LocalStep = { memoryGb: number; recommended: string; choices: LocalChoice[]; ollama: boolean; installed: string[]; download: string | null; commands: Record<string, string | null> };

/** The step dots at the top of the setup window. */
export function SetupSteps({ current }: { current: (typeof STEPS)[number] }) {
  const at = STEPS.indexOf(current);
  return <ol className="setup-steps" aria-label="Setup steps">{STEPS.map((s, i) =>
    <li key={s} aria-current={i === at ? 'step' : undefined} data-done={i < at || undefined}>{s}</li>)}</ol>;
}

async function get<T>(client: SessionClient, path: string): Promise<T | null> {
  try { const r = await client.request({ method: 'GET', path } as never); return r.status === 200 ? r.body as T : null; } catch { return null; }
}
const save = (client: SessionClient, step: FirstRunStep) => client.request({ method: 'PUT', path: '/api/first-run', body: { step } } as never).catch(() => null);

/** True while the signed-in owner still has setup steps to do (null while asking). */
export function useFirstRun(client: SessionClient, owner: boolean): { pending: boolean | null; step: FirstRunStep } {
  const [state, setState] = useState<{ pending: boolean | null; step: FirstRunStep }>({ pending: owner ? null : false, step: 'tools' });
  useEffect(() => {
    if (!owner) { setState({ pending: false, step: 'tools' }); return; }
    let live = true;
    void get<{ pending: boolean; step: FirstRunStep }>(client, '/api/first-run').then(r => { if (live) setState({ pending: !!r?.pending, step: r?.step ?? 'tools' }); });
    return () => { live = false; };
  }, [client, owner]);
  return state;
}

/** Clears what is typed on the shell's line first (Ctrl+U; Esc in PowerShell), so an earlier command is not run with it. */
const CLEAR_LINE = typeof navigator !== 'undefined' && /win/i.test(navigator.platform) ? '\u001b' : '\u0015';
/** Types a fixed command into a fresh shell of Girru's terminal; the owner presses Enter. */
function useSetupTerminal(client: SessionClient) {
  const t = useMemo(() => ({ tabs: new TerminalTabs(client), prefs: new TerminalPrefsController(client) }), [client]);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => () => t.tabs.dispose(), [t]);
  const type = (label: string, command: string) => {
    setShown(label);
    const tab = t.tabs.getSnapshot().tabs[0] ?? t.tabs.add();
    if (!tab) return;
    // Type once the shell has printed its prompt, so the command is not echoed before it.
    let typed = false;
    const off = tab.terminal.onOutput(() => { if (typed) return; typed = true; setTimeout(() => { off(); tab.terminal.write(CLEAR_LINE + command); }, 150); });
  };
  const pane = shown ? <div className="setup-terminal" aria-label={`Terminal · ${shown}`}>
    <p className="setup-terminal-note"><UiIcon name="terminal" size={13}/>{shown}: the command is typed for you. Press Enter to run it.</p>
    <TerminalPane tabs={t.tabs} prefs={t.prefs} projectId={null} maximized={false} onToggleMax={() => {}} onClose={() => setShown(null)}/>
  </div> : null;
  return { type, pane, open: !!shown };
}

export function FirstRunSetup({ client, initialStep, onDone }: { client: SessionClient; initialStep: FirstRunStep; onDone: (chatId: string | null) => void }) {
  const [step, setStep] = useState<FirstRunStep>(initialStep);
  const [signedIn, setSignedIn] = useState(false);
  const terminal = useSetupTerminal(client);
  useEffect(() => { void window.dproApp?.setSetupWindow?.(true).catch(() => {}); }, []);
  // "Skip" on the local model needs a signed-in subscription, also when setup continues at that step.
  useEffect(() => { void get<{ tools: AiTool[] }>(client, '/api/first-run/tools').then(r => { if (r) setSignedIn(r.tools.some(t => t.signedIn)); }); }, [client]);
  const go = (s: FirstRunStep) => { setStep(s); void save(client, s); };
  const finish = async () => {
    let chatId: string | null = null;
    try { const r = await client.request({ method: 'POST', path: '/api/first-run/finish' } as never); chatId = (r.body as { conversationId?: string } | null)?.conversationId ?? null; } catch { /* the workspace opens anyway */ }
    void window.dproApp?.setSetupWindow?.(false).catch(() => {});
    onDone(chatId);
  };
  const appearance = useAppTheme();
  return <div className="shell app-shell first-run-shell" data-theme={appearance.theme} lang="en" dir="ltr"><main className="first-run-setup" aria-label="Set up Girru">
    <SetupSteps current={step === 'tools' ? 'AI tools' : step === 'model' ? 'Local model' : 'Team'}/>
    {step === 'tools' && <ToolsStep client={client} terminal={terminal} onSignedIn={setSignedIn} onNext={() => go('model')}/>}
    {step === 'model' && <ModelStep client={client} terminal={terminal} canSkip={signedIn} onBack={() => go('tools')} onNext={() => go('team')}/>}
    {step === 'team' && <TeamStep client={client} onBack={() => go('model')} onDone={finish}/>}
  </main></div>;
}

type Terminal = ReturnType<typeof useSetupTerminal>;

function ToolsStep({ client, terminal, onSignedIn, onNext }: { client: SessionClient; terminal: Terminal; onSignedIn: (v: boolean) => void; onNext: () => void }) {
  const [tools, setTools] = useState<AiTool[] | null>(null);
  const read = async () => { const r = await get<{ tools: AiTool[] }>(client, '/api/first-run/tools'); if (r) { setTools(r.tools); onSignedIn(r.tools.some(t => t.signedIn)); } };
  useEffect(() => { void read(); }, [client]);
  // While the terminal is open, look again every few seconds: a row turns green by itself after sign-in.
  useEffect(() => { if (!terminal.open) return; const t = setInterval(() => void read(), 3000); return () => clearInterval(t); }, [terminal.open]);
  const any = !!tools?.some(t => t.signedIn);
  const none = !!tools && !tools.some(t => t.installed);
  return <section className="setup-pane" aria-label="Your AI tools">
    <h2>Your AI tools</h2>
    <p>{none ? 'None of them is on this computer yet.' : 'Your agents think with these. Sign in to at least one; your own subscription pays, Girru adds nothing.'}</p>
    {!tools ? <p role="status">Looking at this computer…</p> : <ul className="setup-rows">{tools.map(t => <li key={t.id} className="setup-row">
      <span className="setup-mark" data-tool={t.id} aria-hidden="true">{t.id === 'claude' ? 'CC' : t.id === 'codex' ? 'CX' : 'GE'}</span>
      <span className="setup-row-text"><b>{t.name}</b><small data-state={t.signedIn ? 'ok' : t.installed ? 'warn' : undefined}>
        {t.signedIn ? 'Installed · signed in' : t.installed ? 'Installed · not signed in' : t.needs === 'node' ? 'Not installed · needs Node.js first' : 'Not installed'}</small></span>
      {t.signedIn ? <UiIcon name="check" size={16}/>
        : t.installed ? <button type="button" onClick={() => terminal.type(t.name, t.signIn)}>Sign in</button>
        : t.install ? <button type="button" onClick={() => terminal.type(t.name, t.install!)}><UiIcon name="download" size={13}/>Install</button> : null}
    </li>)}</ul>}
    {terminal.pane ?? <p className="fine-print">"Install" and "Sign in" open the terminal here with the command ready; nothing runs before you press Enter.</p>}
    {tools && !any && <p className="setup-note" role="note"><UiIcon name="info" size={14}/>No subscription? Continue with only the free local model (next step). Agents will be slower and simpler.</p>}
    <div className="setup-actions"><button type="button" className="primary" disabled={!tools} onClick={onNext}>Continue</button></div>
  </section>;
}

function ModelStep({ client, terminal, canSkip, onBack, onNext }: { client: SessionClient; terminal: Terminal; canSkip: boolean; onBack: () => void; onNext: () => void }) {
  const [info, setInfo] = useState<LocalStep | null>(null);
  const [pick, setPick] = useState('');
  const [started, setStarted] = useState(false);
  useEffect(() => { void get<LocalStep>(client, '/api/first-run/local-model').then(r => { if (r) { setInfo(r); setPick(r.recommended); } }); }, [client]);
  const has = !!info?.installed.some(n => n === pick || n.startsWith(pick + '-'));
  const command = info?.commands[pick] ?? null;
  const install = () => { if (command) { terminal.type('Local model', command); setStarted(true); } };
  return <section className="setup-pane" aria-label="A free model on this computer">
    <h2>A free model on this computer</h2>
    <p>Private and offline. Girru uses it for small, frequent work (sorting tasks, short replies, memory) so your subscription lasts longer.{info ? ` This computer has ${info.memoryGb} GB of memory.` : ''}</p>
    {!info ? <p role="status">Looking at this computer…</p> : <div role="radiogroup" aria-label="Local model" className="setup-rows">{info.choices.map(c =>
      <label key={c.id} className="setup-row setup-choice" data-on={pick === c.id || undefined}>
        <input type="radio" name="local-model" aria-label={c.label} checked={pick === c.id} onChange={() => setPick(c.id)}/>
        <span className="setup-row-text"><b>{c.label} {c.id === info.recommended && <span className="badge setup-recommended">Recommended for this computer</span>}</b><small>{info.installed.includes(c.id) ? 'Already on this computer' : c.note}</small></span>
        <span className="setup-size">{c.sizeGb} GB</span>
      </label>)}</div>}
    {info?.download && !info.ollama && <p className="setup-note" role="note"><UiIcon name="info" size={14}/>Girru runs local models with Ollama, a free program. <a href={info.download} target="_blank" rel="noreferrer">Download Ollama</a>, open it once, then come back and press Install.</p>}
    {terminal.pane ?? <p className="fine-print">Install opens the terminal here: it installs Ollama if needed and downloads the model. You can go on while it downloads.</p>}
    <div className="setup-actions"><button type="button" onClick={onBack}>Back</button>{canSkip && !started && !has && <button type="button" className="link-button" onClick={onNext}>Skip</button>}
      {has || started ? <button type="button" className="primary" onClick={onNext}>Continue</button>
        : <button type="button" className="primary" disabled={!command} onClick={install}>Install</button>}</div>
  </section>;
}

const COUNTS = [3, 5, 10, 25, 50] as const;
/** Departments ticked first for a new team, in this order, as far as the catalogue has them. */
const STARTERS = ['marketing', 'sales', 'support', 'customer-support', 'development'];

function TeamStep({ client, onBack, onDone }: { client: SessionClient; onBack: () => void; onDone: () => void }) {
  const controller = useMemo(() => new CompanyController(client), [client]);
  useEffect(() => () => controller.dispose(), [controller]);
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [query, setQuery] = useState('');
  const [other, setOther] = useState('');
  const [custom, setCustom] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!s.catalogue && s.owner && s.phase !== 'loading') void controller.loadCatalogue(); }, [s.owner, s.catalogue]);
  const busy = ['loading', 'planning', 'hiring'].includes(s.phase);
  const choose = (n: number) => {
    if (!Number.isSafeInteger(n) || n < 1) return;
    controller.chooseTotal(n);
    // Pre-tick what fits the number: fewer departments for a small team.
    const want = n <= 3 ? 1 : n <= 10 ? 3 : 4;
    const ids = s.catalogue?.departments.map(d => d.id) ?? [];
    if (!controller.getSnapshot().departments.length) for (const id of STARTERS.filter(x => ids.includes(x)).slice(0, want)) controller.toggleDepartment(id);
  };
  // When every agent is hired, the team is shown by itself (Mohamed 2026-10-30).
  const allHired = s.step === 'done' || (!!s.batch?.done && !s.batch.failed);
  useEffect(() => { if (allHired) setReady(true); }, [allHired]);
  if (ready) return <TeamReady client={client} onStart={onDone}/>;
  if (s.step === 'hiring' || s.step === 'done') {
    const b = s.batch;
    const done = s.step === 'done' || !!b?.done;
    return <section className="setup-pane" aria-label="Hiring your team">
      <h2>Hiring your team</h2><p>A few seconds. If one fails, the others stay hired and you can try it again.</p>
      <ul className="setup-progress">{(b?.departments ?? []).map(d => { const label = s.shares.find(x => x.department === d.department)?.departmentLabel ?? d.department;
        return <li key={d.department}><b>{label}</b><progress max={d.total} value={d.created}>{d.created} of {d.total}</progress><span>{d.created} of {d.total}{d.failed ? ` · ${d.failed} not hired` : ''}</span></li>; })}</ul>
      {s.notice && <p role="status">{s.notice}</p>}
      <div className="setup-actions">
        {s.phase === 'stopped' && b && b.failed > 0 && b.pending === 0 && <button type="button" disabled={busy} onClick={() => void controller.retryFailed()}>Try again</button>}
        {(s.phase === 'stopped' || s.phase === 'error') && !done && <button type="button" disabled={busy} onClick={() => void controller.continueBatch()}>Continue hiring</button>}
        <button type="button" className="primary" disabled={!done} onClick={() => setReady(true)}>See your team</button>
      </div>
    </section>;
  }
  if (s.step === 'review') {
    const total = sharesTotal(s.shares);
    const share = s.shares.find(x => x.department === open);
    return <section className="setup-pane" aria-label="Your team">
      <h2>Your team</h2>
      <p>{total} {total === 1 ? 'agent' : 'agents'} over {s.shares.length} {s.shares.length === 1 ? 'department' : 'departments'}. Drag a line to move people; click a department to change its jobs or personality.</p>
      {s.shares.length > 0 && <TeamPicture shares={s.shares} busy={busy} onOpen={setOpen} onMove={(a, b, [l, r]) => { controller.editShare(a.department, { count: l }); controller.editShare(b.department, { count: r }); }}/>}
      <ul className="setup-split">{s.shares.map(x => <li key={x.department}><b>{x.departmentLabel}</b><span>{jobsLine(x)}</span></li>)}</ul>
      {share && <DepartmentJobs share={share} busy={busy} controller={controller} onClose={() => setOpen(null)}/>}
      <p className="fine-print">Everyone starts Careful: asks you before doing anything outside Girru.</p>
      {s.notice && <p role="status">{s.notice}</p>}
      <div className="setup-actions"><button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
        <button type="button" className="primary" disabled={busy || !total} onClick={() => void controller.hireBatch()}>Hire {total} {total === 1 ? 'agent' : 'agents'}</button></div>
    </section>;
  }
  if (s.step === 'departments' && s.catalogue) {
    const list = s.catalogue.departments.filter(d => `${d.label} ${d.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
    const known = new Set(s.catalogue.departments.map(d => d.id));
    return <section className="setup-pane" aria-label="Which departments?">
      <h2>Which departments?</h2>
      <p>Pick the work you need. Girru splits your {s.total} {s.total === 1 ? 'agent' : 'agents'} by what each department usually needs.</p>
      <label className="setup-search"><UiIcon name="search" size={13}/><input type="search" aria-label="Search departments" placeholder="Search departments" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <ul className="setup-departments">{list.map(d => { const on = s.departments.includes(d.id);
        return <li key={d.id}><button type="button" aria-pressed={on} disabled={busy} onClick={() => controller.toggleDepartment(d.id)}>
          <DepartmentTile department={d.label} size={26}/><span><b>{d.label}</b><small>{d.summary}</small></span>{on && <UiIcon name="check" size={15}/>}</button></li>; })}
        {s.departments.filter(d => !known.has(d)).map(d => <li key={d}><button type="button" aria-pressed onClick={() => controller.toggleDepartment(d)}><DepartmentTile department={d} size={26}/><span><b>{d}</b><small>Your own department</small></span><UiIcon name="check" size={15}/></button></li>)}
      </ul>
      <form className="setup-add" onSubmit={e => { e.preventDefault(); if (controller.addCustom(custom)) setCustom(''); }}>
        <UiIcon name="plus" size={13}/><input aria-label="Add your own department" placeholder="Add your own department" maxLength={64} value={custom} onChange={e => setCustom(e.target.value)}/>{custom.trim() && <button type="submit">Add</button>}
      </form>
      {s.notice && <p role="status">{s.notice}</p>}
      <div className="setup-actions"><button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
        <button type="button" className="primary" disabled={busy || !s.departments.length} onClick={() => void controller.propose()}>See the split</button></div>
    </section>;
  }
  return <section className="setup-pane" aria-label="How many agents do you want?">
    <h2>How many agents do you want?</h2>
    <p>Your Main agent leads them. You can hire or remove people any time.</p>
    {!s.catalogue ? <p role="status">{s.notice ?? 'Reading the departments…'}</p> : <>
      <div className="setup-counts" role="radiogroup" aria-label="Number of agents">{COUNTS.map(n =>
        <button key={n} type="button" role="radio" aria-checked={s.total === n} onClick={() => choose(n)}><b>{n}</b><small>agents</small></button>)}</div>
      <form className="setup-other" onSubmit={e => { e.preventDefault(); choose(Number(other)); }}>
        <label>Another number<input type="number" inputMode="numeric" min={1} max={s.catalogue.maxTotal ?? 1000} value={other} onChange={e => setOther(e.target.value)}/></label><small>up to {s.catalogue.maxTotal ?? 1000}</small>
      </form>
      <p className="fine-print">More agents do more at once, and use more of your subscription.</p>
      {s.open.length > 0 && <p className="setup-note"><UiIcon name="info" size={14}/>Unfinished hiring: {s.open[0].created} of {s.open[0].total} hired. <button type="button" className="link-button" onClick={() => void controller.resume(s.open[0].id)}>Continue it</button></p>}
    </>}
    <div className="setup-actions"><button type="button" onClick={onBack}>Back</button>
      <button type="button" className="primary" disabled={!s.catalogue || s.total === undefined} onClick={() => { if (s.total !== undefined) choose(s.total); }}>Continue</button></div>
  </section>;
}

function jobsLine(x: Share) {
  const jobs = shareSpecialties(x).filter(r => r.count > 0);
  return jobs.length ? jobs.map(r => r.count > 1 ? `${r.name} ×${r.count}` : r.name).join(', ') : rolesSummary(shareRoles(x));
}

/** FR3d: one department's jobs with − / +; the department's count follows the jobs, so counts always add up. */
function DepartmentJobs({ share, busy, controller, onClose }: { share: Share; busy: boolean; controller: CompanyController; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.focus(); }, [share.department]);
  const rows = shareSpecialties(share);
  const set = (i: number, count: number) => {
    const next = rows.map((r, j) => j === i ? { ...r, count: Math.max(0, count) } : r);
    const total = next.reduce((n, r) => n + r.count, 0);
    if (total < 1) return;
    controller.editShare(share.department, { count: total });
    controller.editSpecialties(share.department, next);
  };
  const choices = (controller.getSnapshot().catalogue?.specialties ?? []).filter(c => c.department === share.department && !rows.some(r => r.name.toLowerCase() === c.name.toLowerCase()));
  return <div ref={box} tabIndex={-1} className="setup-popover" role="dialog" aria-label={`${share.departmentLabel}: jobs`} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <header><b>{share.departmentLabel} · {share.count}</b><button type="button" className="tool" aria-label="Close" title="Close" onClick={onClose}><UiIcon name="close" size={13}/></button></header>
    <span className="setup-popover-label">Jobs</span>
    <ul>{rows.map((r, i) => <li key={r.name || i}><span>{r.name}</span><span className="setup-stepper">
      <button type="button" className="tool" aria-label={`One less ${r.name}`} disabled={busy || r.count < 1} onClick={() => set(i, r.count - 1)}><UiIcon name="minus" size={12}/></button>
      <b>{r.count}</b>
      <button type="button" className="tool" aria-label={`One more ${r.name}`} disabled={busy} onClick={() => set(i, r.count + 1)}><UiIcon name="plus" size={12}/></button></span></li>)}</ul>
    <span className="setup-popover-label">Personality</span>
    <PersonalityPicker client={controller.client} value={share.personalities?.specialist} disabled={busy} onPick={e => controller.editShare(share.department, { role: 'specialist', personality: { id: e.id, revision: e.revision } })}/>
    {choices.length > 0 && <label className="setup-popover-add">Add a job<select value="" disabled={busy} onChange={e => { const c = choices.find(x => x.name === e.target.value); if (c) { controller.editSpecialties(share.department, [...rows, { name: c.name, description: c.description, count: 1 }]); controller.editShare(share.department, { count: share.count + 1 }); } }}>
      <option value="">Choose from Specialties…</option>{choices.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></label>}
  </div>;
}

/** A steady colour per name, so each person is told apart at a glance. */
function faceColor(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 45% 42%)`; }

/** After hiring: the people just hired, by department, then straight to Chat (Mohamed 2026-10-30). */
function TeamReady({ client, onStart }: { client: SessionClient; onStart: () => void }) {
  const agents = useMemo(() => new AgentsController(client), [client]);
  useEffect(() => { void agents.list(); return () => agents.dispose(); }, [agents]);
  const a = useSyncExternalStore(agents.subscribe, agents.getSnapshot, agents.getSnapshot);
  const [starting, setStarting] = useState(false);
  const main = a.agents.find(x => x.isPrimary);
  const groups = new Map<string, typeof a.agents[number][]>();
  for (const x of a.agents) if (!x.isPrimary) { const k = x.department || 'Team'; groups.set(k, [...(groups.get(k) ?? []), x]); }
  return <section className="setup-pane" aria-label="Your team is ready">
    <h2>Your team is ready</h2>
    <p>{main ? `${main.name ?? 'Your Main agent'} leads them and talks to you first.` : 'Your Main agent leads them and talks to you first.'} Everyone asks you before doing anything outside Girru.</p>
    {a.phase === 'listing' && !a.agents.length ? <p role="status">Reading your team…</p> : <ul className="setup-team">
      {[...groups].map(([dep, people]) => <li key={dep}><span className="setup-team-dep"><DepartmentTile department={dep} size={20}/><b>{dep}</b></span>
        <span className="setup-faces">{people.slice(0, 12).map(p => <span key={p.id} className="setup-face" title={p.name ?? ''}><span className="setup-face-dot" aria-hidden="true" style={{ background: faceColor(p.name ?? p.id) }}>{(p.name ?? '?').trim().slice(0, 1).toUpperCase()}</span><small>{p.name}</small></span>)}
          {people.length > 12 && <small className="setup-more">+{people.length - 12}</small>}</span></li>)}
    </ul>}
    <div className="setup-actions"><button type="button" className="primary" disabled={starting} onClick={() => { setStarting(true); onStart(); }}>Start chatting</button></div>
  </section>;
}
